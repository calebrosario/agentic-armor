# OpenCode Sandbox Base Image
# Minimal base image for OpenCode task sandboxes
# Target size: <200MB

FROM node:20-alpine

LABEL maintainer="OpenCode Team"
LABEL description="Minimal base image for OpenCode task sandboxes"
LABEL version="1.0.0"

# Install essential tools
RUN apk add --no-cache \
    git \
    curl \
    wget \
    vim \
    nano \
    bash \
    ca-certificates \
    openssl \
    openssh-client \
    coreutils \
    procps

# Create non-root user for security
RUN addgroup -g 1000 opencode && \
    adduser -D -u 1000 -G opencode opencode opencode

# Create workspace directory
RUN mkdir -p /workspace && \
    chown -R opencode:opencode /workspace

# Set working directory
WORKDIR /workspace

# Set default environment variables
ENV NODE_ENV=production \
    PATH="/home/opencode/.local/bin:${PATH}"

# Verify installations
RUN node --version && \
    npm --version && \
    git --version && \
    curl --version

# Switch to non-root user
USER opencode

# Set default command
CMD ["/bin/bash"]
