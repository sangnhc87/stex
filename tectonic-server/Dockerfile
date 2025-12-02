FROM node:18-slim

# Install system dependencies
# - texlive-binaries: provides 'synctex' command
# - libssl-dev, openssl, curl: required for installing/running Tectonic
RUN apt-get update && apt-get install -y \
    curl \
    libssl-dev \
    openssl \
    texlive-binaries \
    && rm -rf /var/lib/apt/lists/*

# Install Tectonic (LaTeX compiler)
RUN curl --proto '=https' --tlsv1.2 -fsSL https://drop-sh.fullyjustified.net |sh && \
    mv tectonic /usr/local/bin/

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Create temp_work directory
RUN mkdir -p temp_work

# Expose port
EXPOSE 3001

# Start server
CMD [ "node", "server.js" ]
