import { animeMaker } from '#anime';

export default animeMaker({
    command: ['bored', 'aburrido'],
    soloPhrases: {
        hombre: ['está aburrido', 'se aburre', 'bosteza de aburrimiento', 'mira al techo aburrido'],
        mujer: ['está aburrida', 'se aburre', 'bosteza de aburrimiento', 'mira al techo aburrida'],
        otro: ['está aburrido', 'se aburre', 'bosteza de aburrimiento', 'mira al techo aburrido']
    },
    togetherPhrases: {
        hombre: ['se aburre con', 'está aburrido de', 'bosteza por culpa de', 'no soporta el aburrimiento de'],
        mujer: ['se aburre con', 'está aburrida de', 'bosteza por culpa de', 'no soporta el aburrimiento de'],
        otro: ['se aburre con', 'está aburrido de', 'bosteza por culpa de', 'no soporta el aburrimiento de']
    }
});
