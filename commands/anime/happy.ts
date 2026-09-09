import { animeMaker } from '#anime';

export default animeMaker({
    command: ['happy', 'feliz'],
    description: 'Está feliz solo o con alguien',
    soloPhrases: {
        global: ['está feliz', 'sonríe de alegría', 'brinca de felicidad', 'su cara irradia felicidad']
    },
    togetherPhrases: {
        global: ['está feliz con', 'comparte su alegría con', 'sonríe por', 'brinca de felicidad por']
    }
});
