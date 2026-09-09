import { animeMaker } from '#anime';

export default animeMaker({
    command: ['wave', 'hola'],
    description: 'Saluda a alguien o al mundo',
    soloPhrases: {
        global: ['saluda con la mano', 'agita la mano con alegría', 'saluda al mundo', 'hace un gesto de saludo']
    },
    togetherPhrases: {
        global: ['saluda con alegría a', 'agita la mano hacia', 'le dice hola a', 'saluda con una sonrisa a']
    }
});
