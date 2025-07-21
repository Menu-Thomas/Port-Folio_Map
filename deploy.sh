#!/bin/bash

# Portfolio Deployment Script
# Prepares the portfolio for production deployment

echo "🚀 Portfolio Deployment Script"
echo "=============================="

# Configuration
PROJECT_NAME="Portfolio-Thomas-Menu"
BUILD_DIR="dist"
STAGING_DIR="staging"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check requirements
check_requirements() {
    print_status "Checking requirements..."
    
    # Check if we're in the right directory
    if [ ! -f "main.js" ] || [ ! -f "portfolio.html" ]; then
        print_error "Please run this script from the portfolio root directory"
        exit 1
    fi
    
    # Check for required tools
    command -v node >/dev/null 2>&1 || { 
        print_warning "Node.js not found. Some optimizations will be skipped."
        NODE_AVAILABLE=false
    }
    
    NODE_AVAILABLE=true
    print_success "Requirements check completed"
}

# Create build directory
setup_build() {
    print_status "Setting up build directory..."
    
    # Clean previous build
    rm -rf "$BUILD_DIR"
    mkdir -p "$BUILD_DIR"
    
    print_success "Build directory created: $BUILD_DIR"
}

# Copy files to build directory
copy_files() {
    print_status "Copying files to build directory..."
    
    # Copy HTML files
    cp *.html "$BUILD_DIR/" 2>/dev/null || true
    
    # Copy JavaScript files
    cp *.js "$BUILD_DIR/" 2>/dev/null || true
    
    # Copy CSS files
    cp *.css "$BUILD_DIR/" 2>/dev/null || true
    
    # Copy JSON files
    cp *.json "$BUILD_DIR/" 2>/dev/null || true
    
    # Copy .htaccess
    cp .htaccess "$BUILD_DIR/" 2>/dev/null || true
    
    # Copy directories
    cp -r public "$BUILD_DIR/" 2>/dev/null || true
    cp -r components "$BUILD_DIR/" 2>/dev/null || true
    cp -r pages "$BUILD_DIR/" 2>/dev/null || true
    cp -r sidepages "$BUILD_DIR/" 2>/dev/null || true
    cp -r styles "$BUILD_DIR/" 2>/dev/null || true
    cp -r js "$BUILD_DIR/" 2>/dev/null || true
    
    print_success "Files copied to build directory"
}

# Optimize files for production
optimize_files() {
    print_status "Optimizing files for production..."
    
    # Remove development files
    rm -f "$BUILD_DIR/js/portfolio-tester.js"
    rm -f "$BUILD_DIR/IMPLEMENTATION_REPORT.md"
    rm -f "$BUILD_DIR"/*.md
    
    # Enable production mode in JavaScript
    if [ -f "$BUILD_DIR/main.js" ]; then
        # This is a simple replacement - in a real scenario you'd use a proper build tool
        sed -i.bak 's/const isProduction = false/const isProduction = true/g' "$BUILD_DIR/main.js" 2>/dev/null || true
        rm -f "$BUILD_DIR/main.js.bak"
    fi
    
    print_success "Files optimized for production"
}

# Validate assets
validate_assets() {
    print_status "Validating assets..."
    
    local missing_assets=()
    
    # Check for required HTML files
    required_html=("index.html" "portfolio.html" "404.html")
    for file in "${required_html[@]}"; do
        if [ ! -f "$BUILD_DIR/$file" ]; then
            missing_assets+=("$file")
        fi
    done
    
    # Check for required directories
    required_dirs=("public" "public/models" "public/textures")
    for dir in "${required_dirs[@]}"; do
        if [ ! -d "$BUILD_DIR/$dir" ]; then
            missing_assets+=("$dir/")
        fi
    done
    
    # Check for critical 3D models
    critical_models=("Hex.glb" "skillFlower.glb")
    for model in "${critical_models[@]}"; do
        if [ ! -f "$BUILD_DIR/public/models/$model" ]; then
            missing_assets+=("public/models/$model")
        fi
    done
    
    if [ ${#missing_assets[@]} -eq 0 ]; then
        print_success "All critical assets found"
    else
        print_warning "Missing assets detected:"
        for asset in "${missing_assets[@]}"; do
            echo "  - $asset"
        done
    fi
}

# Generate deployment info
generate_info() {
    print_status "Generating deployment info..."
    
    cat > "$BUILD_DIR/deployment-info.txt" << EOF
Portfolio Deployment Information
===============================

Build Date: $(date)
Build Script Version: 1.0
Project: $PROJECT_NAME

Files included:
- HTML pages: $(find "$BUILD_DIR" -name "*.html" | wc -l)
- JavaScript files: $(find "$BUILD_DIR" -name "*.js" | wc -l)
- CSS files: $(find "$BUILD_DIR" -name "*.css" | wc -l)
- 3D models: $(find "$BUILD_DIR/public/models" -name "*.glb" 2>/dev/null | wc -l)
- Textures: $(find "$BUILD_DIR/public/textures" -name "*" -type f 2>/dev/null | wc -l)

Production optimizations applied:
- Debug logging disabled
- Development files removed
- Asset validation performed

Deployment checklist:
□ Upload all files to web server
□ Configure server headers (.htaccess)
□ Test HTTPS certificate
□ Verify asset loading
□ Test on multiple devices/browsers
□ Configure analytics (if using external service)
□ Set up monitoring
□ Create backup

Note: This is an automated build. Verify all functionality before going live.
EOF

    print_success "Deployment info generated"
}

# Create zip archive
create_archive() {
    print_status "Creating deployment archive..."
    
    local archive_name="${PROJECT_NAME}-$(date +%Y%m%d-%H%M%S).zip"
    
    cd "$BUILD_DIR"
    zip -r "../$archive_name" . -x "deployment-info.txt"
    cd ..
    
    print_success "Archive created: $archive_name"
}

# Performance check
performance_check() {
    print_status "Running performance checks..."
    
    # Check file sizes
    local large_files=$(find "$BUILD_DIR" -type f -size +1M)
    if [ ! -z "$large_files" ]; then
        print_warning "Large files detected (>1MB):"
        echo "$large_files" | while read -r file; do
            size=$(du -h "$file" | cut -f1)
            echo "  - $file ($size)"
        done
    fi
    
    # Count total assets
    local total_files=$(find "$BUILD_DIR" -type f | wc -l)
    local total_size=$(du -sh "$BUILD_DIR" | cut -f1)
    
    print_status "Build summary: $total_files files, $total_size total"
    
    if (( total_files > 200 )); then
        print_warning "High number of files detected. Consider asset optimization."
    fi
}

# Security check
security_check() {
    print_status "Running security checks..."
    
    # Check for sensitive files
    sensitive_patterns=("*.env" "*.key" "*password*" "*secret*")
    for pattern in "${sensitive_patterns[@]}"; do
        if find "$BUILD_DIR" -name "$pattern" -type f | grep -q .; then
            print_error "Sensitive files detected matching pattern: $pattern"
            find "$BUILD_DIR" -name "$pattern" -type f
        fi
    done
    
    # Check .htaccess
    if [ -f "$BUILD_DIR/.htaccess" ]; then
        print_success "Security headers file (.htaccess) included"
    else
        print_warning "No .htaccess file found. Security headers not configured."
    fi
}

# Main execution
main() {
    echo
    print_status "Starting deployment preparation..."
    echo
    
    check_requirements
    setup_build
    copy_files
    optimize_files
    validate_assets
    performance_check
    security_check
    generate_info
    create_archive
    
    echo
    print_success "Deployment preparation completed!"
    echo
    echo "Next steps:"
    echo "1. Review the build in the '$BUILD_DIR' directory"
    echo "2. Test the portfolio locally from the build directory"
    echo "3. Upload the archive to your web server"
    echo "4. Configure server settings (HTTPS, redirects, etc.)"
    echo "5. Test on live environment"
    echo
    print_status "Build location: $(pwd)/$BUILD_DIR"
    print_status "Deployment info: $(pwd)/$BUILD_DIR/deployment-info.txt"
    echo
}

# Run main function
main "$@"
