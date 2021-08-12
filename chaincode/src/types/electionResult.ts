import {Object, Property} from 'fabric-contract-api';
import {PartialElectionResult} from './partialElectionResult';

@Object()
export class ElectionResult {
    @Property()
    public DocType: string;

    @Property()
    public ID: string;

    @Property()
    public ElectionId: string;

    @Property('Data', 'number[]')
    public Data: number[];

    @Property('PartialElectionResults', 'PartialElectionResult[]')
    public PartialElectionResults: PartialElectionResult[];

    constructor(ElectionId: string, Data: number[], PartialElectionResults: PartialElectionResult[]) {
        this.DocType = 'electionResult';
        this.ID = `electionResult_${ElectionId}`;

        this.ElectionId = ElectionId;
        this.Data = Data;
        this.PartialElectionResults = PartialElectionResults;
    }
}
