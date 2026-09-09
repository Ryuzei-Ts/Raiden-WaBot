import { animeMaker } from '#anime';

export default animeMaker({
    command: ['bored', 'aburrido'],
    description: 'Está aburrido solo o con alguien',
    soloPhrases: {
        global: ['está aburrido', 'se aburre', 'bosteza de aburrimiento', 'mira al techo aburrido']
    },
    togetherPhrases: {
        global: ['se aburre con', 'está aburrido de', 'bosteza por culpa de', 'no soporta el aburrimiento de']
    }
});
