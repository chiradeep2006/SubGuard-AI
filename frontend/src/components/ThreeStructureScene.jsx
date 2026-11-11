import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeStructureScene({ className = '', height = '450px' }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // Scene & Camera
    const scene = new THREE.Scene();
    const width = currentMount.clientWidth || 400;
    const heightPx = currentMount.clientHeight || 450;
    const camera = new THREE.PerspectiveCamera(45, width / heightPx, 0.1, 1000);
    camera.position.z = 7;

    // Renderer
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      console.warn('WebGL not supported:', e);
      return;
    }

    renderer.setSize(width, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    currentMount.appendChild(renderer.domElement);

    // Group for 3D structure
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // 1. Geodesic / Icosahedron Structural Wireframe
    const icoGeometry = new THREE.IcosahedronGeometry(2.2, 1);
    const icoWireframe = new THREE.WireframeGeometry(icoGeometry);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0.7,
    });
    const icoLines = new THREE.LineSegments(icoWireframe, lineMaterial);
    mainGroup.add(icoLines);

    // 2. Vertex Nodes on Structure (Subscription Endpoints)
    const nodeGeometry = new THREE.SphereGeometry(0.06, 8, 8);
    const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0xec4899 });
    const posAttribute = icoGeometry.attributes.position;
    for (let i = 0; i < posAttribute.count; i += 3) {
      const vx = posAttribute.getX(i);
      const vy = posAttribute.getY(i);
      const vz = posAttribute.getZ(i);
      const nodeMesh = new THREE.Mesh(nodeGeometry, nodeMaterial);
      nodeMesh.position.set(vx, vy, vz);
      mainGroup.add(nodeMesh);
    }

    // 3. Central Holographic Security Core (Octahedron Shield)
    const coreGeo = new THREE.OctahedronGeometry(1.2, 0);
    const coreMat = new THREE.MeshPhongMaterial({
      color: 0x7c3aed,
      emissive: 0x3b0764,
      wireframe: true,
      shininess: 90,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    mainGroup.add(coreMesh);

    // 4. Orbital Planetary Ring
    const ringGeo = new THREE.TorusGeometry(3.1, 0.02, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xa78bfa,
      transparent: true,
      opacity: 0.45,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2.3;
    ringMesh.rotation.y = Math.PI / 6;
    mainGroup.add(ringMesh);

    // 5. Data Particles Floating in 3D Space
    const particlesCount = 180;
    const particlePositions = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 8;
      particlePositions[i + 1] = (Math.random() - 0.5) * 8;
      particlePositions[i + 2] = (Math.random() - 0.5) * 8;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(particlePositions, 3)
    );
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xa78bfa,
      size: 0.045,
      transparent: true,
      opacity: 0.8,
    });
    const particlePoints = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particlePoints);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xa78bfa, 2.5);
    dirLight1.position.set(5, 5, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xec4899, 1.8);
    dirLight2.position.set(-5, -5, 2);
    scene.add(dirLight2);

    // Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (event) => {
      const rect = currentMount.getBoundingClientRect();
      mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    };

    window.addEventListener('mousemove', handleMouseMove);

    const handleResize = () => {
      if (!currentMount || !renderer) return;
      const w = currentMount.clientWidth;
      const h = currentMount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    let animId;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      targetX += (mouseX * 0.5 - targetX) * 0.05;
      targetY += (mouseY * 0.5 - targetY) * 0.05;

      mainGroup.rotation.y = elapsedTime * 0.25 + targetX;
      mainGroup.rotation.x = Math.sin(elapsedTime * 0.3) * 0.2 + targetY;

      coreMesh.rotation.y = -elapsedTime * 0.5;
      coreMesh.rotation.z = Math.cos(elapsedTime * 0.4) * 0.3;

      ringMesh.rotation.z = elapsedTime * 0.15;
      particlePoints.rotation.y = elapsedTime * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`relative w-full overflow-hidden select-none ${className}`}
      style={{ height }}
    >
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-navy-950 via-transparent to-transparent z-10" />
    </div>
  );
}

