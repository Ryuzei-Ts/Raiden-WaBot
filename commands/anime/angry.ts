import { animeMaker } from '#anime';

export default animeMaker({
    command: ['angry', 'enojar'],
    soloPhrases: {
        hombre: [
            'está enojado',
            'aprieta los puños con rabia',
            'su cara refleja ira',
            'respira hondo para calmarse'
        ],
        mujer: [
            'está enojada',
            'aprieta los puños con rabia',
            'su cara refleja ira',
            'respira hondo para calmarse'
        ],
        otro: [
            'está enojad@',
            'aprieta los puños con rabia',
            'su cara refleja ira',
            'respira hondo para calmarse'
        ]
    },
    togetherPhrases: {
        hombre: [
            'se enoja con',
            'muestra su ira a',
            'está furioso con',
            'se enfada por culpa de'
        ],
        mujer: [
            'se enoja con',
            'muestra su ira a',
            'está furiosa con',
            'se enfada por culpa de'
        ],
        otro: [
            'se enoja con',
            'muestra su ira a',
            'está furioso con',
            'se enfada por culpa de'
        ]
    }
});
