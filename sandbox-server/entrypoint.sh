#!/bin/sh

USER_HOME_DIR=$(eval echo ~${USER:-appuser})
SSH_DIR="$USER_HOME_DIR/.ssh"
APP_DIR="${WORKING_DIRECTORY:-/workspace/app}"

setup_ssh() {
  if [ ! -z "$SSH_PRIVATE_KEY" ] && [ ! -z "$SSH_PUBLIC_KEY" ]; then
    mkdir -p $SSH_DIR

    echo "$SSH_PRIVATE_KEY" > $SSH_DIR/id_rsa
    echo "$SSH_PUBLIC_KEY" > $SSH_DIR/id_rsa.pub
    chmod 600 $SSH_DIR/id_rsa
    chmod 644 $SSH_DIR/id_rsa.pub
    
    echo "SSH keys have been set up."

    # Disable strict host key checking
    echo "Host *" > $SSH_DIR/config
    echo "    StrictHostKeyChecking no" >> $SSH_DIR/config
    chmod 600 $SSH_DIR/config

    # Ensure the SSH directory and files are owned by the non-root user
    chown -R ${USER:-appuser}:${GROUP:-appuser} $SSH_DIR
  else
    echo "SSH keys were not provided. Skipping SSH setup."
  fi
}

clone_repository() {
  if [ -n "$REPO_URL" ]; then
    if [ -d $APP_DIR/.git ]; then
      echo "Repository already cloned."
    else
      echo "Cloning repository $REPO_URL into $APP_DIR"
      git clone --branch ${BRANCH:-main} $REPO_URL $APP_DIR
    fi

    # Ensure the workspace directory is owned by the non-root user
    chown -R ${USER:-appuser}:${GROUP:-appuser} $APP_DIR
  else
    echo "No repository URL provided. Skipping cloning."
  fi
}

setup_ssh
clone_repository

exec "$@"

sleep infinity