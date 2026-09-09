import { animeMaker } from '#anime';

export default animeMaker({
    command: ['think'],
    description: 'Piensa solo o en alguien',
    soloPhrases: {
        global: ['piensa', 'reflexiona', 'medita', 'está en sus pensamientos']
    },
    togetherPhrases: {
        global: ['piensa en', 'reflexiona sobre', 'medita acerca de', 'sus pensamientos están en']
    }
});
