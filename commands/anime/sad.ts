import { animeMaker } from '#anime';

export default animeMaker({
    command: ['sad', 'triste'],
    description: 'Está triste solo o por alguien',
    soloPhrases: {
        global: ['está triste', 'siente nostalgia', 'su mirada refleja tristeza', 'suspira con pesar']
    },
    togetherPhrases: {
        global: ['está triste por', 'siente nostalgia por', 'sufre por la ausencia de', 'su tristeza es por']
    }
});
