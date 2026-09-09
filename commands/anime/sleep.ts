import { animeMaker } from '#anime';

export default animeMaker({
    command: ['sleep', 'dormir'],
    soloPhrases: {
        hombre: [
            'duerme plácidamente',
            'se duerme sin preocupaciones',
            'descansa profundamente',
            'se queda dormido'
        ],
        mujer: [
            'duerme plácidamente',
            'se duerme sin preocupaciones',
            'descansa profundamente',
            'se queda dormida'
        ],
        otro: [
            'duerme plácidamente',
            'se duerme sin preocupaciones',
            'descansa profundamente',
            'se queda dormide'
        ]
    },
    togetherPhrases: {
        hombre: [
            'duerme junto a',
            'se duerme al lado de',
            'descansa con',
            'comparte sueño con'
        ],
        mujer: [
            'duerme junto a',
            'se duerme al lado de',
            'descansa con',
            'comparte sueño con'
        ],
        otro: [
            'duerme junto a',
            'se duerme al lado de',
            'descansa con',
            'comparte sueño con'
        ]
    }
});
