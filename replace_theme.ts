import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const replacements = [
  [/text-green-500/g, 'text-theme-primary'],
  [/text-green-400/g, 'text-theme-primary-light'],
  [/text-green-300/g, 'text-theme-primary\/80'],
  [/text-green-100/g, 'text-theme-text-light'],
  [/bg-black/g, 'bg-theme-bg'],
  [/bg-green-950/g, 'bg-theme-primary-darker'],
  [/bg-green-900/g, 'bg-theme-primary-dark'],
  [/bg-green-500/g, 'bg-theme-primary'],
  [/border-green-500/g, 'border-theme-primary'],
  [/border-green-400/g, 'border-theme-primary-light'],
  [/fill-green-500/g, 'fill-theme-primary'],
  [/ring-green-400/g, 'ring-theme-primary-light'],
  [/rgba\(34,197,94/g, 'rgba(var(--color-primary)'],
  [/rgba\(74,222,128/g, 'rgba(var(--color-primary-light)'],
  [/#4ade80/g, 'rgb(var(--color-primary-light))'],
];

replacements.forEach(([regex, replacement]) => {
  content = content.replace(regex, replacement as string);
});

fs.writeFileSync('src/App.tsx', content);
console.log('Replacements done');
