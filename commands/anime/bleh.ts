import { animeMaker } from '#anime';

export default animeMaker({
    command: ['bleh'],
    description: 'Hace una mueca de desagrado',
    soloPhrases: {
        global: ['saca la lengua', 'hace una mueca', 'dice "bleh"', 'pone cara de asco']
    },
    togetherPhrases: {
        global: ['le hace "bleh" a', 'saca la lengua a', 'hace muecas a', 'se burla de']
    }
});
