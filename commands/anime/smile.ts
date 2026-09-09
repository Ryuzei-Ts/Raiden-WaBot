import { animeMaker } from '#anime';

export default animeMaker({
    command: ['smile', 'sonreir'],
    description: 'Sonríe a alguien o a ti mismo',
    soloPhrases: {
        global: ['sonríe con alegría', 'muestra una sonrisa', 'sonríe sin razón', 'una sonrisa ilumina su rostro']
    },
    togetherPhrases: {
        global: ['sonríe a', 'dedica una sonrisa a', 'regala una sonrisa a', 'sonríe con cariño a']
    }
});
