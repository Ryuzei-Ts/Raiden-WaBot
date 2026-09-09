import { animeMaker } from '#anime';

export default animeMaker({
    command: ['angry', 'enojar'],
    description: 'Muestra enojo hacia alguien o a ti mismo',
    soloPhrases: {
        hombre: ['está enojado', 'aprieta los puños con rabia', 'su cara refleja ira', 'respira hondo para calmarse'],
        mujer: ['está enojada', 'aprieta los puños con rabia', 'su cara refleja ira', 'respira hondo para calmarse'],
        otro: ['está enojade', 'aprieta los puños con rabia', 'su cara refleja ira', 'respira hondo para calmarse'],
        indefinido: ['está enojad@', 'aprieta los puños con rabia', 'su cara refleja ira', 'respira hondo para calmarse']
    },
    togetherPhrases: {
        hombre: ['se enoja con', 'muestra su ira a', 'está furioso con', 'se enfada por culpa de'],
        mujer: ['se enoja con', 'muestra su ira a', 'está furiosa con', 'se enfada por culpa de'],
        otro: ['se enoja con', 'muestra su ira a', 'está furiose con', 'se enfada por culpa de'],
        indefinido: ['se enoja con', 'muestra su ira a', 'está furioso con', 'se enfada por culpa de']
    }
});
