import { animeMaker } from '#anime';

export default animeMaker({
    command: ['wave', 'hola', 'hi'],
    soloPhrases: {
        hombre: [
            'saluda con la mano',
            'agita la mano con alegría',
            'saluda al mundo',
            'hace un gesto de saludo'
        ],
        mujer: [
            'saluda con la mano',
            'agita la mano con alegría',
            'saluda al mundo',
            'hace un gesto de saludo'
        ],
        otro: [
            'saluda con la mano',
            'agita la mano con alegría',
            'saluda al mundo',
            'hace un gesto de saludo'
        ]
    },
    togetherPhrases: {
        hombre: [
            'saluda con alegría a',
            'agita la mano hacia',
            'le dice hola a',
            'saluda con una sonrisa a'
        ],
        mujer: [
            'saluda con alegría a',
            'agita la mano hacia',
            'le dice hola a',
            'saluda con una sonrisa a'
        ],
        otro: [
            'saluda con alegría a',
            'agita la mano hacia',
            'le dice hola a',
            'saluda con una sonrisa a'
        ]
    }
});
