import { animeMaker } from '#anime';

export default animeMaker({
    command: ['cry', 'llorar'],
    description: 'Llora por alguien o por ti mismo',
    soloPhrases: {
        global: ['llora en silencio', 'derrama lágrimas de tristeza', 'solloza con el corazón roto', 'las lágrimas caen sin control']
    },
    togetherPhrases: {
        global: ['llora desconsoladamente por', 'derrama lágrimas por', 'sufre y llora por', 'solloza por la ausencia de']
    }
});
