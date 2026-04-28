import Particles from "@tsparticles/react";

const particleOptions = {
  fullScreen: { enable: true, zIndex: 0 },

  background: {
    color: "#070A12",
  },

  particles: {
    number: { value: 60 },

    color: { value: "#4f8cff" },

    links: {
      enable: true,
      color: "#4f8cff",
      distance: 150,
      opacity: 0.4,
      width: 1,
    },

    move: {
      enable: true,
      speed: 1,
    },

    size: {
      value: { min: 1, max: 3 },
    },

    opacity: {
      value: 0.6,
    },
  },

  interactivity: {
    events: {
      onHover: {
        enable: true,
        mode: "repulse",
      },
    },
    modes: {
      repulse: {
        distance: 100,
      },
    },
  },
};

export default function ParticlesBackground() {
  return (
    <Particles
      id="tsparticles"
      options={particleOptions}
    />
  );
}