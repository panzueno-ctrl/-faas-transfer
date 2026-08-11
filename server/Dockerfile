FROM node:20-bookworm-slim

# Mise à jour et installation des outils de conversion
RUN apt-get update && apt-get install -y \
    libreoffice \
    ffmpeg \
    imagemagick \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-fra \
    && rm -rf /var/lib/apt/lists/*

# Fix pour autoriser ImageMagick à lire/écrire des PDF (nécessaire sur Debian/Ubuntu récent)
RUN sed -i 's/<policy domain="coder" rights="none" pattern="PDF" \/>/<policy domain="coder" rights="read|write" pattern="PDF" \/>/g' /etc/ImageMagick-6/policy.xml || true

# Création du répertoire de l'application
WORKDIR /usr/src/app

# Copie des fichiers de configuration Node.js
COPY package*.json ./

# Installation des dépendances
RUN npm install

# Copie du reste des fichiers du backend
COPY . .

# Exposition du port
EXPOSE 3000

# Commande de démarrage
CMD ["npm", "start"]
