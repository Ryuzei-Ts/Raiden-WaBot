import { animeMaker } from '#anime';

export default animeMaker({
    command: ['sleep'],
    description: 'Duerme solo o con alguien',
    soloPhrases: {
        hombre: ['duerme plácidamente', 'se duerme sin preocupaciones', 'descansa profundamente', 'se queda dormido'],
        mujer: ['duerme plácidamente', 'se duerme sin preocupaciones', 'descansa profundamente', 'se queda dormida'],
        otro: ['duerme plácidamente', 'se duerme sin preocupaciones', 'descansa profundamente', 'se queda dormide'],
        indefinido: ['duerme plácidamente', 'se duerme sin preocupaciones', 'descansa profundamente', 'se queda dormid@']
    },
    togetherPhrases: {
        hombre: ['duerme junto a', 'se duerme al lado de', 'descansa con', 'comparte sueño con'],
        mujer: ['duerme junto a', 'se duerme al lado de', 'descansa con', 'comparte sueño con'],
        otro: ['duerme junto a', 'se duerme al lado de', 'descansa con', 'comparte sueño con'],
        indefinido: ['duerme junto a', 'se duerme al lado de', 'descansa con', 'comparte sueño con']
    }
});
