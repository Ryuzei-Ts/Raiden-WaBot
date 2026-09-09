import { animeMaker } from '#anime';

export default animeMaker({
    command: ['push'],
    description: 'Empuja a alguien o a sí mismo',
    soloPhrases: {
        global: ['empuja con fuerza', 'se empuja', 'da un empujón', 'empuja la puerta']
    },
    togetherPhrases: {
        global: ['empuja a', 'da un empujón a', 'lleva a', 'mueve a']
    }
});
