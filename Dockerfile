FROM node:alpine

ARG GITHUB_TOKEN

RUN apk add --update \
    python \
    python-dev \
    py-pip \
    git

RUN pip install --upgrade pip

RUN pip install "git+https://${GITHUB_TOKEN}@github.com/callrail/secretmgmt.git"

WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install

# Bundle app source
COPY . .

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]

CMD [ "npm", "start" ]
