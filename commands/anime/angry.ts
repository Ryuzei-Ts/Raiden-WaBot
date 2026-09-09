import { animeMaker } from '#anime';

export default animeMaker({
    command: ['angry', 'enojar'],
    description: 'Muestra enojo hacia alguien o a ti mismo',
    soloPhrases: {
        global: ['está enojado', 'aprieta los puños con rabia', 'su cara refleja ira', 'respira hondo para calmarse']
    },
    togetherPhrases: {
        global: ['se enoja con', 'muestra su ira a', 'está furioso con', 'se enfada por culpa de']
    }
});
