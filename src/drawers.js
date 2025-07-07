// Assuming you have an array or group of drawer meshes called `drawers`
drawers.forEach(drawer => {
    drawer.userData.originalPosition = drawer.position.clone();

    drawer.on('mouseover', () => {
        // Animate to new position
        drawer.position.x = drawer.userData.originalPosition.x - 0.01;
        drawer.position.z = drawer.userData.originalPosition.z + 0.01;
    });

    drawer.on('mouseout', () => {
        // Animate back to original position
        drawer.position.x = drawer.userData.originalPosition.x;
        drawer.position.z = drawer.userData.originalPosition.z;
    });
});