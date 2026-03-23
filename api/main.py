import os
import re
import uuid
import unicodedata
from datetime import datetime

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from models import init_db, get_db, Post, User, Contact
from auth import create_access_token, verify_token, hash_password, verify_password

app = FastAPI(title="Barbearia VIP API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://novosite.barbeariavip.com.br",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:3000",
        "http://localhost:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploaded images
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "img", "blog")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Initialize database on startup
init_db()


# ========== SCHEMAS ==========

class LoginRequest(BaseModel):
    email: str
    password: str

class PostCreate(BaseModel):
    title: str
    excerpt: str | None = None
    content: str
    image_url: str | None = None
    status: str = "draft"
    published_at: datetime | None = None

class PostUpdate(BaseModel):
    title: str | None = None
    excerpt: str | None = None
    content: str | None = None
    image_url: str | None = None
    status: str | None = None
    published_at: datetime | None = None

class ContactCreate(BaseModel):
    name: str
    phone: str | None = None
    email: str
    message: str


# ========== AUTH DEPENDENCY ==========

def get_current_user(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = authorization[7:]
    email = verify_token(token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return email


# ========== HELPERS ==========

def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^\w\s-]", "", text.lower())
    text = re.sub(r"[-\s]+", "-", text).strip("-")
    return text

def strip_html(text: str) -> str:
    return re.sub(r"<[^>]+>", "", text)


# ========== AUTH ENDPOINTS ==========

@app.post("/api/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}


# ========== PUBLIC BLOG ENDPOINTS ==========

@app.get("/api/posts")
def list_posts(limit: int = 10, offset: int = 0, db: Session = Depends(get_db)):
    posts = (
        db.query(Post)
        .filter(Post.status == "published")
        .order_by(Post.published_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [
        {
            "id": p.id,
            "title": p.title,
            "slug": p.slug,
            "excerpt": p.excerpt,
            "image_url": p.image_url,
            "published_at": p.published_at.isoformat() if p.published_at else None,
        }
        for p in posts
    ]


@app.get("/api/posts/{slug_or_id}")
def get_post(slug_or_id: str, db: Session = Depends(get_db)):
    if slug_or_id.isdigit():
        post = db.query(Post).filter(Post.id == int(slug_or_id)).first()
    else:
        post = db.query(Post).filter(Post.slug == slug_or_id).first()

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return {
        "id": post.id,
        "title": post.title,
        "slug": post.slug,
        "excerpt": post.excerpt,
        "content": post.content,
        "image_url": post.image_url,
        "status": post.status,
        "published_at": post.published_at.isoformat() if post.published_at else None,
        "created_at": post.created_at.isoformat() if post.created_at else None,
    }


# ========== ADMIN BLOG ENDPOINTS ==========

@app.get("/api/admin/posts")
def admin_list_posts(
    db: Session = Depends(get_db),
    _user: str = Depends(get_current_user),
):
    posts = db.query(Post).order_by(Post.created_at.desc()).all()
    return [
        {
            "id": p.id,
            "title": p.title,
            "slug": p.slug,
            "status": p.status,
            "published_at": p.published_at.isoformat() if p.published_at else None,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in posts
    ]


@app.post("/api/admin/posts")
def create_post(
    data: PostCreate,
    db: Session = Depends(get_db),
    _user: str = Depends(get_current_user),
):
    slug = slugify(data.title)
    # Ensure unique slug
    existing = db.query(Post).filter(Post.slug == slug).first()
    if existing:
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"

    post = Post(
        title=strip_html(data.title)[:200],
        slug=slug,
        excerpt=strip_html(data.excerpt)[:500] if data.excerpt else None,
        content=data.content,
        image_url=data.image_url,
        status=data.status,
        published_at=data.published_at or (datetime.utcnow() if data.status == "published" else None),
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return {"id": post.id, "slug": post.slug}


@app.put("/api/admin/posts/{post_id}")
def update_post(
    post_id: int,
    data: PostUpdate,
    db: Session = Depends(get_db),
    _user: str = Depends(get_current_user),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if data.title is not None:
        post.title = strip_html(data.title)[:200]
        post.slug = slugify(data.title)
    if data.excerpt is not None:
        post.excerpt = strip_html(data.excerpt)[:500]
    if data.content is not None:
        post.content = data.content
    if data.image_url is not None:
        post.image_url = data.image_url
    if data.status is not None:
        post.status = data.status
        if data.status == "published" and not post.published_at:
            post.published_at = datetime.utcnow()
    if data.published_at is not None:
        post.published_at = data.published_at

    post.updated_at = datetime.utcnow()
    db.commit()
    return {"id": post.id, "slug": post.slug}


@app.delete("/api/admin/posts/{post_id}")
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    _user: str = Depends(get_current_user),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    db.delete(post)
    db.commit()
    return {"success": True}


# ========== IMAGE UPLOAD ==========

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

@app.post("/api/admin/upload")
async def upload_image(
    file: UploadFile = File(...),
    _user: str = Depends(get_current_user),
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type not allowed. Use: {', '.join(ALLOWED_EXTENSIONS)}")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max 5MB.")

    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(content)

    return {"url": f"/img/blog/{filename}"}


# ========== CONTACT ENDPOINT ==========

@app.post("/api/contact")
def submit_contact(data: ContactCreate, db: Session = Depends(get_db)):
    # Validate
    name = strip_html(data.name)[:100]
    email = strip_html(data.email)[:255]
    message = strip_html(data.message)[:2000]
    phone = strip_html(data.phone)[:20] if data.phone else None

    if not name or not email or not message:
        raise HTTPException(status_code=400, detail="Name, email and message are required")

    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise HTTPException(status_code=400, detail="Invalid email format")

    contact = Contact(name=name, phone=phone, email=email, message=message)
    db.add(contact)
    db.commit()
    return {"success": True, "message": "Mensagem recebida com sucesso"}


# ========== SEED ADMIN ==========

@app.on_event("startup")
def seed_admin():
    db = next(get_db())
    try:
        if db.query(User).count() == 0:
            admin = User(
                email="admin@barbeariavip.com.br",
                password_hash=hash_password("vip2024admin"),
            )
            db.add(admin)
            db.commit()
            print("Admin user created: admin@barbeariavip.com.br / vip2024admin")
    finally:
        db.close()
