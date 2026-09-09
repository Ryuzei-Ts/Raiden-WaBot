import { animeMaker } from '#anime';

export default animeMaker({
    command: ['handhold'],
    description: 'Toma la mano de alguien o de sí mismo',
    soloPhrases: {
        global: ['se toma la mano', 'se agarra la mano', 'se da la mano', 'entrelaza sus dedos']
    },
    togetherPhrases: {
        global: ['toma la mano de', 'agarra la mano de', 'da la mano a', 'entrelaza sus dedos con']
    }
});
