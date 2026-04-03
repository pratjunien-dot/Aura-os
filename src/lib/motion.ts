export const panelVariants = {
  hidden:  { opacity: 0, scale: 0.96, filter: 'blur(8px)', y: 12 },
  visible: {
    opacity: 1, scale: 1, filter: 'blur(0px)', y: 0,
    transition: { duration: 0.48, ease: [0.25, 0.46, 0.45, 0.94] }
  },
  exit:    { opacity: 0, scale: 0.94, filter: 'blur(6px)', y: -8,
    transition: { duration: 0.28, ease: [0.55, 0, 1, 0.45] }
  }
};

export const drawerVariants = {
  hidden:  { x: '-100%', opacity: 0 },
  visible: {
    x: 0, opacity: 1,
    transition: { type: 'spring', stiffness: 320, damping: 30 }
  },
  exit:    { x: '-100%', opacity: 0,
    transition: { duration: 0.28, ease: [0.55, 0, 1, 0.45] }
  }
};

export const cardVariants = {
  hidden:  { opacity: 0, y: 20, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }
  })
};

export const overlayVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.22 } },
  exit:    { opacity: 0, transition: { duration: 0.18 } }
};
