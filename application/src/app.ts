import crypto = require('crypto');
import {Gateway, GatewayOptions} from 'fabric-network';
import {BigInteger} from 'jsbn';
import NodeRSA from 'node-rsa';
import * as path from 'path';
import {Candidate} from './types/candidate';
import {Election} from './types/election';
import {JudgeProposal} from './types/judgeProposal';
import {OrgIdentity} from './types/orgIdentity';
import {VotePart} from './types/votePart';
import {VoterAuthorization} from './types/voterAuthorization';
import {buildCCPOrg1, buildWallet} from './utils/AppUtil';
import {buildCAClient, enrollAdmin, registerAndEnrollUser} from './utils/CAUtil';

// tslint:disable-next-line:no-var-requires
const BlindSignature = require('blind-signatures');

const channelName = 'zvoting';
const chaincodeName = 'zvoting';
const orgMsp = 'Org1MSP';
const walletPath = path.join(__dirname, 'wallet');
const org1UserId = 'appUser';

async function main() {
    try {
        // build an in memory object with the network configuration (also known as a connection profile)
        const ccp = buildCCPOrg1();

        // build an instance of the fabric ca services client based on
        // the information in the network configuration
        const caClient = buildCAClient(ccp, 'ca.org1.example.com');

        // setup the wallet to hold the credentials of the application user
        const wallet = await buildWallet(walletPath);

        // in a real application this would be done on an administrative flow, and only once
        await enrollAdmin(caClient, wallet, orgMsp);

        // in a real application this would be done only when a new user was required to be added
        // and would be part of an administrative flow
        await registerAndEnrollUser(caClient, wallet, orgMsp, org1UserId, 'org1.department1', [
            {name: `${orgMsp}.admin`, value: 'true', ecert: true},
            {name: 'election.judge', value: 'true', ecert: true},
            {name: 'election.creator', value: 'true', ecert: true},
            {name: 'election.voter', value: 'true', ecert: true},
            {name: 'email', value: `admin@${orgMsp}.com`, ecert: true},
        ]);

        // Create a new gateway instance for interacting with the fabric network.
        // In a real application this would be done as the backend server session is setup for
        // a user that has been verified.
        const gateway = new Gateway();

        const gatewayOpts: GatewayOptions = {
            wallet,
            identity: org1UserId,
            discovery: {enabled: true, asLocalhost: true}, // using asLocalhost as this gateway is using a fabric network deployed locally
        };

        try {
            // setup the gateway instance
            // The user will now be able to create connections to the fabric network and be able to
            // submit transactions and query. All transactions submitted by this gateway will be
            // signed by this user using the credentials stored in the wallet.
            await gateway.connect(ccp, gatewayOpts);

            // Build a network instance based on the channel where the smart contract is deployed
            const network = await gateway.getNetwork(channelName);

            // Get the contract from the network.
            const contract = network.getContract(chaincodeName);

            const electionId = Math.floor(Math.random() * 10000);

            let result = null;

            // Delete Org Identity if already exists
            try {
                console.log('\n--> Submit Transaction: DeleteIdentity');
                await contract.submitTransaction('DeleteIdentity');
                console.log('*** Result: DeleteIdentity successful');
            } catch (e) {
                console.error(e.toString());
            }

            // Create election
            try {
                console.log('\n--> Submit Transaction: CreateElection');
                await contract.submitTransaction('CreateElection', `${electionId}`, `election ${electionId}`);
                console.log('*** Result: election created');
            } catch (e) {
                console.error(e.toString());
            }

            let key: any = null;

            // Publish OrgIdentity
            try {
                key = BlindSignature.keyGeneration({b: 2048});

                const privateKey = key.exportKey('pkcs8').toString();
                console.log('\n');
                console.log(privateKey);
                console.log('\n');

                const n = key.keyPair.n.toString();
                const e = key.keyPair.e.toString();

                // console.log(key.keyPair);

                // const collectionKey = `privateKey_${orgMsp}`;

                // Get Private Endorsement Right
                // try {
                //     console.log('\n--> Submit Transaction: AcquirePrivateEndorsementRight');
                //     console.error(`key: ${collectionKey}`);
                //     await contract.submitTransaction('AcquirePrivateEndorsementRight', collectionKey);
                //     console.log('*** Result: AcquirePrivateEndorsementRight succeeded');
                // } catch (e) {
                //     console.error(e.toString());
                // }

                // Save Private Key
                try {
                    console.log('\n--> Submit Transaction: SaveOrgPrivateKey');
                    await contract.createTransaction('SaveOrgPrivateKey')
                        .setTransient({
                            data: Buffer.from(privateKey),
                        })
                        .setEndorsingOrganizations(orgMsp)
                        .submit();
                    console.log('*** Result: SaveOrgPrivateKey succeeded');
                } catch (e) {
                    console.error(e.toString());
                }

                // Fetch Private Key
                try {
                    console.log('\n--> Evaluate Transaction: GetOrgPrivateKey');
                    result = await contract.evaluateTransaction('GetOrgPrivateKey');
                    console.log(`*** Result: ${result}`);
                } catch (e) {
                    console.error(e.toString());
                }

                console.log('\n--> Submit Transaction: PublishIdentity');
                await contract.submitTransaction('PublishIdentity', n, e, crypto.createHash('sha256').update(Buffer.from(privateKey)).digest('base64'));
                console.log('*** Result: OrgIdentity Published');

                console.log('\n--> Evaluate Transaction: FetchOrgIdentity');
                result = await contract.evaluateTransaction('FetchOrgIdentity', orgMsp);
                console.log(`*** Result: ${result}`);

            } catch (e) {
                console.error(e.toString());
            }

            // Judge Proposal Submitted
            try {
                console.log('\n--> Submit Transaction: AddJudgeProposal');
                await contract.submitTransaction('AddJudgeProposal', electionId.toString());
                console.log('*** Result: AddJudgeProposal succeeded');
            } catch (e) {
                console.error(e.toString());
            }

            // Judge Proposal Approved
            try {
                console.log('\n--> Submit Transaction: ApproveJudgeProposal');
                await contract.submitTransaction('ApproveJudgeProposal', `judgeProposal_election${electionId}_${orgMsp}`);
                console.log('*** Result: ApproveJudgeProposal succeeded');
            } catch (e) {
                console.error(e.toString());
            }

            // One candidate is added
            try {
                console.log('\n--> Submit Transaction: AddCandidate');
                await contract.submitTransaction('AddCandidate', 'Candidate A', 'PartyACandidateA', `election${electionId}`);
                console.log('*** Result: Candidate Added');
            } catch (e) {
                console.error(e.toString());
            }

            // One candidate is added
            try {
                console.log('\n--> Submit Transaction: AddCandidate');
                await contract.submitTransaction('AddCandidate', 'Candidate B', 'PartyBCandidateB', `${electionId}`);
                console.log('*** Result: Candidate Added');
            } catch (e) {
                console.error(e.toString());
            }

            try {
                console.log('\n--> Evaluate Transaction: DuplicateCandidateExists');
                result = await contract.evaluateTransaction('DuplicateCandidateExists', 'PartyBCandidateB', `${electionId}`);
                console.log(`*** Result: ${result}`);
            } catch (e) {
                console.error(e.toString());
            }

            // Remove candidate
            try {
                console.log('\n--> Submit Transaction: RemoveCandidate');
                await contract.submitTransaction('RemoveCandidate', `candidate_election${electionId}_PartyBCandidateB`, `${electionId}`);
                console.log('*** Result: Candidate Removed');
            } catch (e) {
                console.error(e.toString());
            }

            // One candidate is added
            try {
                console.log('\n--> Submit Transaction: AddCandidate');
                await contract.submitTransaction('AddCandidate', 'Candidate B', 'PartyBCandidateB', `${electionId}`);
                console.log('*** Result: Candidate Added');
            } catch (e) {
                console.error(e.toString());
            }

            // Get Elections
            try {
                console.log('\n--> Evaluate Transaction: GetElections');
                result = await contract.evaluateTransaction('GetElections');
                console.log(`*** Result: ${result}`);
            } catch (e) {
                console.error(e.toString());
            }

            // Get Election Candidates
            try {
                console.log('\n--> Evaluate Transaction: GetCandidates');
                result = await contract.evaluateTransaction('GetCandidates', `${electionId}`);
                console.log(`*** Result: ${result}`);
            } catch (e) {
                console.error(e.toString());
            }

            // Get Election Judge Proposals
            try {
                console.log('\n--> Evaluate Transaction: GetJudgeProposals');
                result = await contract.evaluateTransaction('GetJudgeProposals', `${electionId}`);
                console.log(`*** Result: ${result}`);
            } catch (e) {
                console.error(e.toString());
            }

            // Get Election Judge Proposals
            try {
                console.log('\n--> Evaluate Transaction: GetJudges');
                result = await contract.evaluateTransaction('GetJudges', `${electionId}`);
                console.log(`*** Result: ${result}`);
            } catch (e) {
                console.error(e.toString());
            }

            try {
                console.log(`\n--> Submit Transaction: MarkElectionAsReady`);
                await contract.submitTransaction('MarkElectionAsReady', `election${electionId}`, '1');
                console.log(`*** Result: MarkElectionAsReady Succeeded`);
            } catch (e) {
                console.error(e.toString());
            }

            try {
                console.log(`\n--> Submit Transaction: AddVoter`);
                await contract.submitTransaction('AddVoter', 'ADMIN', `admin@${orgMsp}.com`, orgMsp, `election${electionId}`);
                console.log(`*** Result: AddVoter Succeeded`);
            } catch (e) {
                console.error(e.toString());
            }

            try {
                console.log(`\n--> Submit Transaction: AddVoter`);
                await contract.submitTransaction('AddVoter', 'AKD', 'akd@gmail.com', orgMsp, `election${electionId}`);
                console.log(`*** Result: AddVoter Succeeded`);
            } catch (e) {
                console.error(e.toString());
            }

            function getRandomString(length: number): Promise<string> {
                return new Promise((resolve, reject) => {
                    crypto.randomBytes(length, (err, buffer) => {
                        const randomString = buffer.toString('hex');

                        if (err !== null) {
                            reject(err);
                        } else {
                            resolve(randomString);
                        }
                    });
                });
            }

            // BLIND VOTER AUTHORIZATION
            try {
                console.log(`\n--> Submit Transaction: SubmitVoterAuthorizationRequest`);

                const judges = JSON.parse((await contract.evaluateTransaction('GetJudges', `${electionId}`)).toString()) as JudgeProposal[];
                const judgeIdentities = new Map<string, OrgIdentity>();
                const judgePubKeys = new Map<string, NodeRSA>();
                const judgeBlindingR = new Map<string, BigInteger>();

                for (const judge of judges) {
                    const judgeIdentity = JSON.parse((await contract.evaluateTransaction('FetchOrgIdentity', judge.Org)).toString()) as OrgIdentity;
                    judgeIdentities.set(judge.Org, judgeIdentity);

                    const N = judgeIdentity.N;
                    const E = judgeIdentity.E;

                    const nHex = new BigInteger(N).toString(16);

                    const judgePubKey = new NodeRSA();
                    judgePubKey.importKey({
                        n: Buffer.from(nHex, 'hex'),
                        e: Number(E),
                    }, 'components-public');

                    judgePubKeys.set(judge.Org, judgePubKey);
                }

                const randomUUID = await getRandomString(32);
                console.log('Random UUID: ', randomUUID);

                for (const judge of judges) {
                    const judgeIdentity = judgeIdentities.get(judge.Org);
                    const N = judgeIdentity.N;
                    const E = judgeIdentity.E;

                    const {blinded, r} = BlindSignature.blind({
                        message: randomUUID,
                        N,
                        E,
                    }) as { blinded: BigInteger, r: BigInteger };

                    judgeBlindingR.set(judge.Org, r);

                    ////////////////////////////////////////////////
                    const blindedMessage = blinded.toString();
                    console.log('Blinded Message\n', blindedMessage);

                    await contract.submitTransaction('SubmitVoterAuthorizationRequest', `election${electionId}`, blindedMessage);
                    console.log(`*** Result: SubmitVoterAuthorizationRequest Succeeded`);

                    ////////////////////////////////////////////////
                }

                for (const judge of judges) {
                    console.log('\n--> Evaluate Transaction: GetVoterAuthorization');
                    const voterAuthorizationData = await contract.evaluateTransaction('GetVoterAuthorization', `election${electionId}`);
                    const voterAuthorization = JSON.parse(voterAuthorizationData.toString()) as VoterAuthorization;

                    const unblindedAuthorization = BlindSignature.unblind({
                        signed: new BigInteger(voterAuthorization.AuthorizationData),
                        N: judgeIdentities.get(judge.Org).N,
                        r: judgeBlindingR.get(judge.Org),
                    }) as BigInteger;

                    const signVerified = BlindSignature.verify({
                        unblinded: unblindedAuthorization,
                        N: judgeIdentities.get(judge.Org).N,
                        E: judgeIdentities.get(judge.Org).E,
                        message: randomUUID,
                    });

                    if (signVerified) {
                        console.log(`${voterAuthorization.Org}: Signatures verified!`);
                    } else {
                        console.log(`${voterAuthorization.Org}: Invalid signature`);
                    }
                }

            } catch (e) {
                console.error(e.toString());
            }

            // Election is started
            try {
                console.log('\n--> Submit Transaction: StartElection');
                await contract.submitTransaction('StartElection', `election${electionId}`);
                console.log('*** Result: election started');
            } catch (e) {
                console.error(e.toString());
            }

            // Get Elections
            try {
                console.log('\n--> Evaluate Transaction: GetElections');
                result = await contract.evaluateTransaction('GetElections');
                console.log(`*** Result: ${result}`);
            } catch (e) {
                console.error(e.toString());
            }

            async function getCandidates(election: Election) {
                const candidatesData = await contract.evaluateTransaction('GetCandidates', `${election.ID}`);
                return JSON.parse(candidatesData.toString()) as Candidate[];
            }

            async function generateVotePartsForCandidate(candidateIdx: number, candidate: Candidate, election: Election, candidates: Candidate[]): Promise<VotePart[]> {
                const voteUUID = await getRandomString(12);
                const votePartCount = 3; // election.Metadata.VotePartCount;

                let lastVotePartData = new Array<number>(candidates.length).fill(0);
                lastVotePartData[candidateIdx] = 1;

                const voteParts: VotePart[] = [];

                for (let votePartNumber = 1; votePartNumber <= votePartCount - 1; votePartNumber++) {
                    const votePartData = Array.from({length: candidates.length}, () => Math.floor(Math.random() * election.Metadata.N));
                    // console.log(`${votePartNumber} => ${votePartData}`);

                    const votePart = new VotePart(voteUUID, votePartNumber, votePartData);
                    votePart.CandidateUniqueId = candidate.UniqueId;
                    voteParts.push(votePart);

                    lastVotePartData = lastVotePartData.map((score, i) => score - votePartData[i]);
                }

                const mod = election.Metadata.N;
                lastVotePartData = lastVotePartData.map((score) => ((score % mod) + mod) % mod);
                const lastVotePart = new VotePart(voteUUID, votePartCount, lastVotePartData);
                lastVotePart.CandidateUniqueId = candidate.UniqueId;
                voteParts.push(lastVotePart);

                return voteParts;
            }

            function verifyVotePartsForCandidate(election: Election, voteParts: VotePart[], candidate?: Candidate) {
                voteParts.forEach((votePart) => {
                    const nodeRSAKey = key as NodeRSA;
                    votePart.verify(nodeRSAKey);
                });

                const mod = election.Metadata.N;
                const combinedVote = voteParts
                    .filter((votePart) => candidate === undefined || votePart.CandidateUniqueId === candidate.UniqueId)
                    .reduce((votePart1, votePart2) => {
                        const votePartData = votePart1.Data
                            .map((score, i) => score + votePart2.Data[i])
                            .map((score) => ((score % mod) + mod) % mod);
                        return new VotePart(votePart1.VoteUUID, 0, votePartData);
                    });

                console.log(`Combined: ${JSON.stringify(combinedVote.Data)}`);
            }

            async function generateVotes(election: Election): Promise<VotePart[]> {
                const candidates = await getCandidates(election);

                let voteParts: VotePart[] = [];

                for (const [idx, candidate] of candidates.entries()) {
                    voteParts = [...voteParts, ...(await generateVotePartsForCandidate(idx, candidate, election, candidates))];
                }

                for (const votePart of voteParts) {
                    const nodeRSAKey = key as NodeRSA;
                    votePart.signHash(nodeRSAKey);
                }

                return voteParts;
            }

            // Get Current Election and Cast Vote
            try {
                console.log('\n--> Evaluate Transaction: GetElection');
                const electionData = await contract.evaluateTransaction('GetElection', `${electionId}`);
                const election = JSON.parse(electionData.toString()) as Election;

                console.log(`Current Election:\n${JSON.stringify(election, null, 2)}`);

                const candidates = await getCandidates(election);
                console.log(`candidate count: ${candidates.length}`);

                const voteParts = await generateVotes(election);
                const chosenCandidate = candidates[0];

                const chosenVoteParts = voteParts
                    .filter((votePart) => votePart.CandidateUniqueId === chosenCandidate.UniqueId)
                    .map((votePart) => {
                        votePart.CandidateUniqueId = null;
                        return votePart;
                    });

                console.log(chosenCandidate.Name);
                verifyVotePartsForCandidate(election, chosenVoteParts);

                const votePartPerNumber = new Map<number, VotePart>();
                chosenVoteParts.forEach((votePart) => votePartPerNumber.set(votePart.VotePartNumber, votePart));

                console.log(votePartPerNumber);

            } catch (e) {
                console.error(e.toString());
            }

        } finally {
            // Disconnect from the gateway when the application is closing
            // This will close all connections to the network
            gateway.disconnect();
        }
    } catch (error) {
        console.error(`******** FAILED to run the application: ${error}`);
    }
}

main()
    .then(() => console.log('Successfully executed app'))
    .catch((reason) => console.error(`Error: ${reason.toString()}`));
