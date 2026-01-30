# OpenCode Sandbox Developer Image
# Development image with additional tools
# Based on opencode-sandbox-base
# Target size: <300MB

FROM opencode-sandbox-base:latest

LABEL maintainer="OpenCode Team"
LABEL description="Development image for OpenCode task sandboxes"
LABEL version="1.0.0"

# Install additional development tools
RUN apk add --no-cache \
    npm \
    jq \
    build-base \
    python3 \
    py3-pip

# Install TypeScript globally
RUN npm install -g typescript tsx @types/node

# Install common utility packages
RUN npm install -g @anthropic-ai/sdk

# Install Python packages for common use cases
RUN pip3 install --no-cache-dir \
    requests \
    python-dotenv

# Verify installations
RUN tsc --version && \
    tsx --version && \
    jq --version && \
    python3 --version && \
    pip3 --version

# Set default command
CMD ["/bin/bash"]
