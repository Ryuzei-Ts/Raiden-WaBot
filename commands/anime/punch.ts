import { animeMaker } from '#anime';

export default animeMaker({
    command: ['punch', 'pegar'],
    soloPhrases: {
        hombre: [
            'lanza un puñetazo al aire',
            'golpea con fuerza',
            'se da un golpe',
            'golpea la pared'
        ],
        mujer: [
            'lanza un puñetazo al aire',
            'golpea con fuerza',
            'se da un golpe',
            'golpea la pared'
        ],
        otro: [
            'lanza un puñetazo al aire',
            'golpea con fuerza',
            'se da un golpe',
            'golpea la pared'
        ]
    },
    togetherPhrases: {
        hombre: [
            'le da un puñetazo a',
            'golpea con fuerza a',
            'le da un golpe a',
            'lanza un golpe a'
        ],
        mujer: [
            'le da un puñetazo a',
            'golpea con fuerza a',
            'le da un golpe a',
            'lanza un golpe a'
        ],
        otro: [
            'le da un puñetazo a',
            'golpea con fuerza a',
            'le da un golpe a',
            'lanza un golpe a'
        ]
    }
});
