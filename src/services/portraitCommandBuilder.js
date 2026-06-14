const DEFAULT_STYLE_MODIFIERS = [
  'pencil sketch',
  'portrait',
  'monochrome',
  'clean lines',
  'white background',
  'high contrast'
];

export function enrichDescription(description) {
  const subject = (description || 'portrait').trim();
  if (!subject) return 'a pencil sketch portrait';

  const lower = subject.toLowerCase();
  const modifiers = [...DEFAULT_STYLE_MODIFIERS];

  if (lower.includes('pencil') || lower.includes('素描')) {
    modifiers.splice(modifiers.indexOf('pencil sketch'), 1);
  }
  if (lower.includes('portrait') || lower.includes('肖像')) {
    modifiers.splice(modifiers.indexOf('portrait'), 1);
  }

  return `${subject}, ${modifiers.join(', ')}`;
}

export function buildPortraitPrompt(command) {
  const description = typeof command === 'string' ? command : (command?.description || 'portrait');
  return enrichDescription(description);
}

export function buildPortraitCommand(rawCommand) {
  return {
    action: 'drawPortrait',
    description: rawCommand.description || 'portrait',
    prompt: buildPortraitPrompt(rawCommand),
    position: rawCommand.position || 'center',
    size: rawCommand.size || 'medium',
    color: rawCommand.color || '#333333'
  };
}
