# Imagem de produção do backend (FastAPI + WeasyPrint) para o Fly.io.
# Espelha exatamente o build.sh/render.yaml que já funciona no Render —
# mesmas dependências de sistema, mesmo comando de start (migração +
# servidor). Ver fly.toml (mesmo diretório) para a configuração do deploy.

# Fixado em Debian 12 (bookworm): em "python:3.12-slim" puro o Debian 13 renomeou
# libgdk-pixbuf2.0-0 e o apt-get quebrava. Bookworm mantém os nomes do build.sh.
FROM python:3.12-slim-bookworm

# Dependências de sistema do WeasyPrint (geração de PDF) — mesma lista do
# backend/build.sh usado no Render — mais gcc/libpq-dev, que o build do
# Render já tinha pronto na imagem base e esta imagem slim não tem: sem
# eles, "pip install psycopg2" (a variante não-binária, que também está
# no requirements.txt) falha tentando compilar.
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    shared-mime-info \
    fonts-liberation \
    gcc \
    libc6-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080

# Mesma lógica do startCommand do Render: roda a migração do banco antes
# de subir o servidor, toda vez que a máquina inicia.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8080"]
