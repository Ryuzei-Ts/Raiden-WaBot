import { animeMaker } from '#anime';

export default animeMaker({
    command: ['dance', 'bailar'],
    soloPhrases: {
        hombre: [
            'baila con alegría',
            'se mueve al ritmo',
            'danza sin parar',
            'baila como si nadie mirara'
        ],
        mujer: [
            'baila con alegría',
            'se mueve al ritmo',
            'danza sin parar',
            'baila como si nadie mirara'
        ],
        otro: [
            'baila con alegría',
            'se mueve al ritmo',
            'danza sin parar',
            'baila como si nadie mirara'
        ]
    },
    togetherPhrases: {
        hombre: [
            'baila con',
            'comparte baile con',
            'danza junto a',
            'baila apasionadamente con'
        ],
        mujer: [
            'baila con',
            'comparte baile con',
            'danza junto a',
            'baila apasionadamente con'
        ],
        otro: [
            'baila con',
            'comparte baile con',
            'danza junto a',
            'baila apasionadamente con'
        ]
    }
});
