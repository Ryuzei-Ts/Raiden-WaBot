import { animeMaker } from '#anime';

export default animeMaker({
    command: ['coffee', 'cafe'],
    soloPhrases: {
        hombre: [
            'toma café tranquilamente',
            'disfruta de su café',
            'saborea el aroma del café',
            'bebe café con calma'
        ],
        mujer: [
            'toma café tranquilamente',
            'disfruta de su café',
            'saborea el aroma del café',
            'bebe café con calma'
        ],
        otro: [
            'toma café tranquilamente',
            'disfruta de su café',
            'saborea el aroma del café',
            'bebe café con calma'
        ]
    },
    togetherPhrases: {
        hombre: [
            'toma café con',
            'comparte un café con',
            'invita a un café a',
            'disfruta de un café con'
        ],
        mujer: [
            'toma café con',
            'comparte un café con',
            'invita a un café a',
            'disfruta de un café con'
        ],
        otro: [
            'toma café con',
            'comparte un café con',
            'invita a un café a',
            'disfruta de un café con'
        ]
    }
});
