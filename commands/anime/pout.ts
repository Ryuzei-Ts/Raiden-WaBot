import { animeMaker } from '#anime';

export default animeMaker({
    command: ['pout'],
    description: 'Hace pucheros solo o por alguien',
    soloPhrases: {
        global: ['hace pucheros', 'frunciendo los labios', 'pone cara de enojo', 'pucherea']
    },
    togetherPhrases: {
        global: ['hace pucheros por', 'frunciendo los labios a', 'pone cara de enojo a', 'pucherea por culpa de']
    }
});
