import crypto = require('crypto');
import {Gateway, GatewayOptions} from 'fabric-network';
import {BigInteger} from 'jsbn';
import NodeRSA from 'node-rsa';
import * as path from 'path';
import {JudgeProposal} from './types/judgeProposal';
import {OrgIdentity} from './types/orgIdentity';
import {buildCCPOrg1, buildWallet} from './utils/AppUtil';
import {buildCAClient, enrollAdmin, registerAndEnrollUser} from './utils/CAUtil';

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

            let key = null;

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

                const collectionKey = `privateKey_${orgMsp}`;

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
                    console.log('\n--> Submit Transaction: saveImplicitPrivateData (Private Key)');
                    await contract.createTransaction('SaveImplicitPrivateData')
                        .setTransient({
                            data: Buffer.from(privateKey),
                        })
                        .setEndorsingOrganizations(orgMsp)
                        .submit(collectionKey);
                    console.log('*** Result: saveImplicitPrivateData succeeded');
                } catch (e) {
                    console.error(e.toString());
                }

                // Fetch Private Key
                try {
                    console.log('\n--> Evaluate Transaction: GetImplicitPrivateData');
                    result = await contract.evaluateTransaction('GetImplicitPrivateData', collectionKey);
                    console.log(`*** Result: ${result}`);
                } catch (e) {
                    console.error(e.toString());
                }

                console.log('\n--> Submit Transaction: PublishIdentity');
                await contract.submitTransaction('PublishIdentity', n, e, crypto.createHash('sha256').update(Buffer.from(privateKey)).digest('base64'));
                console.log('*** Result: OrgIdentity Published');

                console.log('\n--> Evaluate Transaction: FetchIdentity');
                result = await contract.evaluateTransaction('FetchIdentity', orgMsp);
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

            // SEND BLIND AUTHORIZATION REQUEST
            try {
                console.log(`\n--> Submit Transaction: SubmitVoterAuthRequest`);

                const judges = JSON.parse((await contract.evaluateTransaction('GetJudges', `${electionId}`)).toString()) as JudgeProposal[];
                const judgeIdentities = new Map<string, OrgIdentity>();
                const judgeBlindingR = new Map<string, BigInteger>();

                for (const judge of judges) {
                    const judgeIdentity = JSON.parse((await contract.evaluateTransaction('FetchIdentity', judge.Org)).toString()) as OrgIdentity;
                    judgeIdentities.set(judge.Org, judgeIdentity);
                }

                const randomUUID = await getRandomString(32);
                console.log('Random UUID: ', randomUUID);

                for (const judge of judges) {
                    const judgeIdentity = judgeIdentities.get(judge.Org);
                    const N = judgeIdentity.N;
                    const E = judgeIdentity.E;

                    const nHex = new BigInteger(N).toString(16);

                    const judgePubKey = new NodeRSA();
                    judgePubKey.importKey({
                        n: Buffer.from(nHex, 'hex'),
                        e: Number(E),
                    }, 'components-public');

                    const {blinded, r} = BlindSignature.blind({
                        message: randomUUID,
                        N,
                        E,
                    }) as {blinded: BigInteger, r: BigInteger};

                    judgeBlindingR.set(judge.Org, r);

                    ////////////////////////////////////////////////
                    const blindedMessage = blinded.toString();
                    console.log('Blinded Message\n', blindedMessage);

                    await contract.submitTransaction('SubmitVoterAuthRequest', `election${electionId}`, blindedMessage);
                    console.log(`*** Result: SubmitVoterAuthRequest Succeeded`);

                    ////////////////////////////////////////////////
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
