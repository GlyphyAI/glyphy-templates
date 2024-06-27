#!/bin/sh

# Setup SSH keys
if [ ! -z "$SSH_PRIVATE_KEY" ] && [ ! -z "$SSH_PUBLIC_KEY" ]; then
    echo "$SSH_PRIVATE_KEY" > /root/.ssh/id_rsa
    echo "$SSH_PUBLIC_KEY" > /root/.ssh/id_rsa.pub
    chmod 600 /root/.ssh/id_rsa
    chmod 644 /root/.ssh/id_rsa.pub
    echo "SSH keys have been set up."
else
    echo "SSH keys were not provided. Skipping SSH setup."
fi

# Execute the main container command
exec "$@"