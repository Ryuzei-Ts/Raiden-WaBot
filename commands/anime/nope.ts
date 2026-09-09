import { animeMaker } from '#anime';

export default animeMaker({
    command: ['nope'],
    description: 'Dice "nope" o niega a alguien',
    soloPhrases: {
        global: ['dice "nope"', 'niega con la cabeza', 'se niega', 'dice que no']
    },
    togetherPhrases: {
        global: ['le dice "nope" a', 'niega con la cabeza a', 'se niega a', 'dice que no a']
    }
});
