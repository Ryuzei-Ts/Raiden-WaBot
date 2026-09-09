import { animeMaker } from '#anime';

export default animeMaker({
    command: ['bite', 'morder'],
    description: 'Muerde a alguien o a ti mismo',
    soloPhrases: {
        global: ['muerde su labio', 'muerde su dedo', 'muerde una manzana', 'muerde con fuerza']
    },
    togetherPhrases: {
        global: ['muerde a', 'le da un mordisco a', 'muerde el cuello de', 'le muerde la mano a']
    }
});
