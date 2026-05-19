'use client'

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

class Vector2D {

  constructor(x, y) {

    this.x = x;
    this.y = y;

  }

}

class Vector3D {

  constructor(x, y, z) {

    this.x = x;
    this.y = y;
    this.z = z;

  }

}

class Star {

  constructor(cameraZ, cameraTravelDistance) {

    this.angle =
      Math.random() * Math.PI * 2;

    this.distance =
      30 * Math.random() + 15;

    this.rotationDirection =
      Math.random() > 0.5 ? 1 : -1;

    this.expansionRate =
      1.2 + Math.random() * 0.8;

    this.finalScale =
      0.7 + Math.random() * 0.6;

    this.dx =
      this.distance *
      Math.cos(this.angle);

    this.dy =
      this.distance *
      Math.sin(this.angle);

    this.spiralLocation =
      (1 -
        Math.pow(
          1 - Math.random(),
          3,
        )) / 1.3;

    this.z =
      cameraTravelDistance *
      Math.random();

    this.strokeWeightFactor =
      Math.pow(
        Math.random(),
        2,
      );

  }

  render(p, controller) {

    const spiralPos =
      controller.spiralPath(
        this.spiralLocation,
      );

    const q =
      p - this.spiralLocation;

    if (q > 0) {

      const displacementProgress =
        controller.constrain(
          4 * q,
          0,
          1,
        );

      const targetDistance =
        this.distance *
        this.expansionRate *
        1.5;

      const spiralTurns =
        1.2 *
        this.rotationDirection;

      const spiralAngle =
        this.angle +
        spiralTurns *
          displacementProgress *
          Math.PI;

      const screenX =
        spiralPos.x +
        targetDistance *
          Math.cos(
            spiralAngle,
          ) *
          displacementProgress;

      const screenY =
        spiralPos.y +
        targetDistance *
          Math.sin(
            spiralAngle,
          ) *
          displacementProgress;

      const vx =
        (this.z -
          controller.cameraZ) *
        screenX /
        controller.viewZoom;

      const vy =
        (this.z -
          controller.cameraZ) *
        screenY /
        controller.viewZoom;

      const position =
        new Vector3D(
          vx,
          vy,
          this.z,
        );

      const dotSize =
        8.5 *
        this.strokeWeightFactor;

      controller.showProjectedDot(
        position,
        dotSize,
      );

    }

  }

}

class AnimationController {

  constructor(
    canvas,
    ctx,
    size,
  ) {

    this.canvas = canvas;

    this.ctx = ctx;

    this.size = size;

    this.time = 0;

    this.cameraZ = -400;

    this.cameraTravelDistance =
      3400;

    this.startDotYOffset = 28;

    this.viewZoom = 100;

    this.numberOfStars = 5000;

    this.stars = [];

    this.timeline =
      gsap.timeline({
        repeat: -1,
      });

    this.createStars();

    this.setupTimeline();

  }

  createStars() {

    for (
      let i = 0;
      i < this.numberOfStars;
      i++
    ) {

      this.stars.push(
        new Star(
          this.cameraZ,
          this.cameraTravelDistance,
        ),
      );

    }

  }

  setupTimeline() {

    this.timeline.to(this, {
      time: 1,
      duration: 15,
      repeat: -1,
      ease: "none",
      onUpdate: () =>
        this.render(),
    });

  }

  constrain(
    value,
    min,
    max,
  ) {

    return Math.min(
      Math.max(value, min),
      max,
    );

  }

  map(
    value,
    start1,
    stop1,
    start2,
    stop2,
  ) {

    return (
      start2 +
      (stop2 - start2) *
        ((value - start1) /
          (stop1 - start1))
    );

  }

  ease(p, g) {

    if (p < 0.5) {

      return (
        0.5 *
        Math.pow(2 * p, g)
      );

    }

    return (
      1 -
      0.5 *
        Math.pow(
          2 * (1 - p),
          g,
        )
    );

  }

  spiralPath(p) {

    p =
      this.constrain(
        1.2 * p,
        0,
        1,
      );

    p = this.ease(p, 1.8);

    const turns = 6;

    const theta =
      2 *
      Math.PI *
      turns *
      Math.sqrt(p);

    const r =
      170 * Math.sqrt(p);

    return new Vector2D(
      r * Math.cos(theta),
      r * Math.sin(theta) +
        this.startDotYOffset,
    );

  }

  showProjectedDot(
    position,
    sizeFactor,
  ) {

    const t2 =
      this.constrain(
        this.map(
          this.time,
          0.32,
          1,
          0,
          1,
        ),
        0,
        1,
      );

    const newCameraZ =
      this.cameraZ +
      this.ease(
        Math.pow(t2, 1.2),
        1.8,
      ) *
        this.cameraTravelDistance;

    if (
      position.z > newCameraZ
    ) {

      const depth =
        position.z -
        newCameraZ;

      const x =
        (this.viewZoom *
          position.x) /
        depth;

      const y =
        (this.viewZoom *
          position.y) /
        depth;

      const sw =
        (400 * sizeFactor) /
        depth;

      this.ctx.lineWidth = sw;

      this.ctx.beginPath();

      this.ctx.arc(
        x,
        y,
        0.5,
        0,
        Math.PI * 2,
      );

      this.ctx.fill();

    }

  }

  render() {

    const ctx = this.ctx;

    ctx.fillStyle = "black";

    ctx.fillRect(
      0,
      0,
      this.size,
      this.size,
    );

    ctx.save();

    ctx.translate(
      this.size / 2,
      this.size / 2,
    );

    const t1 =
      this.constrain(
        this.map(
          this.time,
          0,
          0.57,
          0,
          1,
        ),
        0,
        1,
      );

    ctx.fillStyle = "white";

    for (const star of this.stars) {

      star.render(
        t1,
        this,
      );

    }

    ctx.restore();

  }

  destroy() {

    this.timeline.kill();

  }

}

export function SpiralAnimation() {

  const canvasRef =
    useRef(null);

  const animationRef =
    useRef(null);

  const [dimensions, setDimensions] =
    useState({
      width:
        window.innerWidth,
      height:
        window.innerHeight,
    });

  useEffect(() => {

    const handleResize =
      () => {

        setDimensions({
          width:
            window.innerWidth,
          height:
            window.innerHeight,
        });

      };

    window.addEventListener(
      "resize",
      handleResize,
    );

    return () => {

      window.removeEventListener(
        "resize",
        handleResize,
      );

    };

  }, []);

  useEffect(() => {

    const canvas =
      canvasRef.current;

    if (!canvas) return;

    const ctx =
      canvas.getContext("2d");

    if (!ctx) return;

    const dpr =
      window.devicePixelRatio ||
      1;

    const size =
      Math.max(
        dimensions.width,
        dimensions.height,
      );

    canvas.width =
      size * dpr;

    canvas.height =
      size * dpr;

    canvas.style.width =
      `${dimensions.width}px`;

    canvas.style.height =
      `${dimensions.height}px`;

    ctx.scale(dpr, dpr);

    animationRef.current =
      new AnimationController(
        canvas,
        ctx,
        size,
      );

    return () => {

      if (
        animationRef.current
      ) {

        animationRef.current.destroy();

      }

    };

  }, [dimensions]);

  return (

    <div className="relative w-full h-full">

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />

    </div>

  );

}