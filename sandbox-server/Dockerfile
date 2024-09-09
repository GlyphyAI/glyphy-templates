FROM node:20

WORKDIR /sandbox-server

COPY package*.json ./

RUN npm install

RUN apt-get update && \
    apt-get install -y openssh-client openssh-server git && \
    rm -rf /var/lib/apt/lists/*

# Authorize SSH Host by adding GitHub's SSH key fingerprint
RUN mkdir -p /root/.ssh && \
    chmod 0700 /root/.ssh && \
    ssh-keyscan github.com > /root/.ssh/known_hosts

COPY . .

COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]

CMD ["npm", "run", "dev"]