import {PartialElectionResult} from './partialElectionResult';

export class ElectionResult {

    public DocType: string;

    public ID: string;

    public ElectionId: string;

    public Data: number[];

    public PartialElectionResults: PartialElectionResult[];

    constructor(ElectionId: string, Data: number[], PartialElectionResults: PartialElectionResult[]) {
        this.DocType = 'electionResult';
        this.ID = `electionResult_${ElectionId}`;

        this.ElectionId = ElectionId;
        this.Data = Data;
        this.PartialElectionResults = PartialElectionResults;
    }
}
