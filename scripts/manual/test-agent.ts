import { runSupportAgent } from './src/lib/agents/supportAgent';
import { runJudgeAgent } from './src/lib/agents/judgeAgent';

async function main() {
    console.log("Running Support Agent...");
    try {
        const support = await runSupportAgent("The sky is green", "Some people say the sky is green.");
        console.log("Support Output:", support);
    } catch (e) {
        console.error("Support Error:", JSON.stringify(e, null, 2));
    }
    
    console.log("Running Judge Agent...");
    try {
        const judge = await runJudgeAgent(
            "The sky is green", 
            { supportingArguments: [], confidenceInSupport: 0 },
            { contradictingArguments: ["The sky is blue."], confidenceInOpposition: 100 },
            { contextualFactors: [], temporalRelevance: "always" }
        );
        console.log("Judge Output:", judge);
    } catch (e) {
        console.error("Judge Error:", JSON.stringify(e, null, 2));
    }
}

main();
