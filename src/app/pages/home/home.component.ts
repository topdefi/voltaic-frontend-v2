import { Component, OnInit } from '@angular/core';
import { SubscribableComponent } from 'ngx-subscribable';
import { StorageService } from 'services/storage.service';
import { BackendQueryApiService } from 'api/backend-query.api'
import { DefaultParams } from 'components/defaults.component';
import { EAppRoutes } from 'enums/routing';
import { ESuffix } from 'pipes/suffixify.pipe';
import { ZoomSwitchService } from 'services/zoomswitch.service';
import { FetchPoolDataService } from 'services/fetchdata.service';
import { MiningInfoService, MiningInfo } from 'api/mining-info.api';
import { NextDifficultyService, NextDifficulty } from 'api/next-difficulty.api';
import { TimeToRetargetService, TimeToRetarget } from 'api/time-to-retarget.api';

import { ILiveStatCommon, IBlockItem, ILuckItem, ICoinParams } from 'interfaces/common';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.less'],
})
export class HomeComponent extends SubscribableComponent implements OnInit {
    readonly EAppRoutes = EAppRoutes;
    readonly ESuffix = ESuffix;

    get activeCoinName(): string {
        return this.storageService.currCoin;
    }
    set activeCoinName(coin: string | '') {
        this.storageService.currCoin = coin;
    }
    get activeCoinObj(): ICoinParams {
        return this.storageService.coinsObj[this.storageService.currCoin];
    }
    set activeCoinObj(data: ICoinParams) {
        this.storageService.coinsObj[this.storageService.currCoin] = data;
    }

    get isLiveStatLoading(): boolean {
        return this.isLiveLoading;
    }

    get isLoadingBlocks(): boolean {
        return this.isBlocksLoading;
    }

    get isPrime(): boolean {
        return (this.storageService.currAlgo === 'PrimePOW')
    }

    isLiveLoading: boolean = true;
    liveStats: ILiveStatCommon;
    mainChartCoin: string = '';
    haveBlocksData: boolean = false;
    haveLuckData: boolean = true;
    isBlocksLoading: boolean;
    showLuck: boolean = false;
    blocks: IBlockItem[];
    poolLuck: ILuckItem[];

    foundBlockKeys: (keyof IBlockItem)[] = ['height', 'hash', 'confirmations', 'generatedCoins', 'foundBy', 'time'];
    foundBlockKeysMobile: (keyof IBlockItem)[] = ['height', 'hash', 'confirmations', 'time'];
    /*
    signUpLink = {
        href: `/${EAppRoutes.Auth}`,
        params: {
            to: decodeURIComponent(`/${userRootRoute}`),
            registration: true,
        },
    };*/
    private subscrip: any;
    private explorersLinks = DefaultParams.BLOCKSLINKS;
    private historyFetcherTimeoutId: number;
    private blocksFetcherTimeoutId: number;
    private changeMainChartCoinTimeoutId: number;
    private isStarting: boolean;
    public miningInfo: MiningInfo | null = null;
    public nextDifficulty: NextDifficulty | null = null;
    public timeToRetarget: TimeToRetarget | null = null;
    constructor(private zoomSwitchService: ZoomSwitchService, private fetchPoolDataService: FetchPoolDataService, private storageService: StorageService, private backendQueryApiService: BackendQueryApiService, private miningInfoService: MiningInfoService, private nextDifficultyService: NextDifficultyService, private timeToRetargetService: TimeToRetargetService,) {
        super();
    }

    private subs(): void {
        this.subscrip = [
            this.zoomSwitchService.zoomSwitch.subscribe(zoom => {
                if (zoom !== '') this.processZoomChange(zoom);
            }),
            this.fetchPoolDataService.apiGetListOfCoins.subscribe(data => {
                if (data.status && data.type === this.storageService.currType) this.processCoins();
            }),
            this.fetchPoolDataService.apiGetLiveStat.subscribe(data => {
                if (data.status && data.type === this.storageService.currType) this.processLive(data.coin);
            }),
            this.fetchPoolDataService.apiGetBlocks.subscribe(data => {
                if (data.status && data.type === this.storageService.currType) this.processBlocks(data.coin);
            }),
        ];
    }
    /*
    getMiningInfo(coin: string): Promise<any> {
        let command: string;

        if (coin === 'LTC') {
            command = 'litecoin-cli getmininginfo';
        } else if (coin === 'DOGE') {
            command = 'dogecoin-cli getmininginfo';
        } else {
            return Promise.reject('Unsupported coin type');
        }

        console.log(`Executing command: ${command}`);
        return new Promise((resolve, reject) => {
            exec(command, (error: any, stdout: string, stderr: string) => {
                if (error) {
                    console.error(`Error executing ${command}:`, error);
                    return reject(`Error executing ${command}: ${error}`);
                }

                console.log('Raw CLI stdout:', stdout);
                console.log('Raw CLI stderr:', stderr);

                try {
                    const data = JSON.parse(stdout);

                    const blocks = data.blocks;
                    const difficulty = data.difficulty;
                    const networkhashps = data.networkhashps;

                    this.miningInfo = { blocks, difficulty, networkhashps };
                    console.log('Formatted Mining Info:', this.miningInfo);
                    resolve(this.miningInfo);
                } catch (parseError) {
                    console.error('Error parsing JSON output:', parseError);
                    reject(`Error parsing JSON output: ${parseError}`);
                }
            });
        });
    }
    */

    // Function to get the time since the last block was found
    public getTimeSinceLastBlock(): string {
        // Ensure there is at least one block.
        if (!this.blocks || this.blocks.length === 0) {
            return 'No blocks found';
        }

        // Assuming blocks are sorted with the latest block first.
        const lastBlock = this.blocks[0];

        // If the block timestamp is in seconds, convert to milliseconds.
        const blockTimestampMillis = lastBlock.time * 1000;
        const now = Date.now();
        const diffMillis = now - blockTimestampMillis;

        // Convert the difference to seconds, minutes, hours, or days as needed.
        const diffSeconds = Math.floor(diffMillis / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        // Return a human-friendly string.
        if (diffDays > 0) {
            return `${diffDays} day(s) ago`;
        } else if (diffHours > 0) {
            return `${diffHours} hour(s) ago`;
        } else if (diffMinutes > 0) {
            return `${diffMinutes} minute(s) ago`;
        } else {
            return `${diffSeconds} second(s) ago`;
        }
    }

    // Total generated coins from all blocks
    public get totalGeneratedCoins(): number {
        return this.blocks.reduce((total, blk) => {
            let coins = blk.generatedCoins;
            if (typeof coins === 'string') {
                coins = coins.replace(/,/g, '');
            }
            return total + Number(coins);
        }, 0);
    }

    fetchMiningData(coin: string): void {
        this.miningInfoService.getMiningInfo(coin)
            .subscribe(
                data => {
                    this.miningInfo = data;
                    console.log('Mining Info:', data);
                },
                error => {
                    console.error('Error fetching mining info:', error);
                }
            );
    }

    fetchNextDifficulty(coin: string): void {
        this.nextDifficultyService.getNextDifficulty(coin)
            .subscribe(
                data => {
                    this.nextDifficulty = data;
                    console.log('Next Difficulty:', data);
                },
                error => {
                    console.error('Error fetching next difficulty:', error);
                }
            );
    }

    fetchTimeToRetarget(coin: string): void {
        this.timeToRetargetService.getTimeToRetarget(coin)
            .subscribe(
                data => {
                    this.timeToRetarget = data;
                    console.log('Time to Retarget:', data);
                },
                error => {
                    console.error('Error fetching time to retarget:', error);
                }
            );
    }

    ngOnInit(): void {
        this.isStarting = true;
        //this.storageService.resetChartsData = true;
        this.storageService.currType = DefaultParams.REQTYPE.POOL;
        this.blocks = [];
        this.subs();
        this.fetchPoolDataService.coins({ coin: '', type: 'pool', forceUpdate: true });
        //this.historyFetcher();
        //this.blocksFetch();
        this.poolLuck = [];
    }
    ngOnDestroy(): void {
        //this.storageService.resetChartsData = true;
        clearTimeout(this.historyFetcherTimeoutId);
        clearTimeout(this.changeMainChartCoinTimeoutId);
        clearTimeout(this.blocksFetcherTimeoutId);
        this.subscrip.forEach(el => el.unsubscribe());
    }

    onBlockClick(block: IBlockItem): void {
        const url = this.explorersLinks[this.activeCoinName] + block.hash;
        window.open(url, '_system');
    }

    onCurrentCoinChange(coin: string): void {
        if (coin === null || coin === '') return;
        if (this.activeCoinName === '') this.activeCoinName = coin;
        this.storageService.coinsObj[coin].is.chartRefresh = true;
        this.setMainCoinTimer(coin);
        this.storageService.coinsObj[this.activeCoinName].is.liveVisible = false;
        this.storageService.coinsObj[this.activeCoinName].is.blocksVisible = false;
        this.storageService.coinsObj[coin].is.liveVisible = true;
        this.storageService.coinsObj[coin].is.blocksVisible = !this.storageService.coinsObj[coin].is.algo;
        this.haveBlocksData = !this.storageService.coinsObj[coin].is.algo;
        this.activeCoinName = coin;
        this.haveLuckData = this.activeCoinName != 'ETC';
        //this.storageService.currAlgo=this.storageService.coinsObj[coin].info.algorithm;
        this.getLiveInfo();
        this.getBloksInfo();

        // Fetch mining data and next difficulty
        this.fetchMiningData(coin);
        this.fetchNextDifficulty(coin);
        this.fetchTimeToRetarget(coin);

        console.log('Selected coin:', this.activeCoinName);
    }

    truncate(fullStr) {
        let s = { sep: '..', front: 0, back: 4 };
        return fullStr.substr(0, s.front) + s.sep + fullStr.substr(fullStr.length - s.back);
    }

    private getPoolLuck(coin: string): void {
        const params = { coin, intervals: DefaultParams.LUCKINTERVALS };
        this.backendQueryApiService.getPoolLuck(params).subscribe(resp => {
            this.poolLuck = [];
            for (let index = 0; index < resp.luck.length; index++) {
                this.poolLuck.push(
                    {
                        period: DefaultParams.LUCKPERIODS[index],
                        interval: DefaultParams.LUCKINTERVALS[index],
                        luck: resp.luck[index]
                    }
                )
            }
        });
    }


    private processZoomChange(zoom: string) {
        if (zoom === null) debugger;
        if (zoom === undefined) debugger;
        if (zoom === '') debugger;
        if (this.storageService.coinsList.length === 0 || this.isStarting) return;
        const coinsObj = this.storageService.coinsObj;
        const mainCoinObj = this.storageService.chartMainCoinObj,
            currTime = mainCoinObj.history.chart.label[mainCoinObj.history.chart.label.length - 1],
            currTime2 = parseInt(((new Date(currTime * 1000).setMinutes(0, 0, 0).valueOf() / 1000) as any).toFixed(0));

        const grI = DefaultParams.ZOOMPARAMS[zoom].groupByInterval;
        const statWindow = DefaultParams.ZOOMPARAMS[zoom].statsWindow;
        const delta = currTime - currTime2;
        let intrevals = Math.round(delta / grI);
        let newTimefrom = 0;

        if (intrevals * grI + currTime2 > currTime) intrevals--;
        if (intrevals === 0) {
            newTimefrom = currTime2 - grI * (statWindow + 1);
        } else {
            newTimefrom = currTime2 - grI * (statWindow + 1 - intrevals);
        }

        const activeCoin = this.activeCoinName;
        this.storageService.chartMainCoinName = this.activeCoinName
        coinsObj[activeCoin].is.chartRefresh = true;

        coinsObj[activeCoin].history.timeFrom = newTimefrom - grI;
        coinsObj[activeCoin].history.grByInterval = grI;
        coinsObj[activeCoin].history.data = [];
        coinsObj[activeCoin].history.chart.data = [];
        coinsObj[activeCoin].history.chart.label = mainCoinObj.history.chart.label;

        const coins = this.storageService.coinsList.filter(item => item !== activeCoin);

        coins.forEach(item => {
            coinsObj[item].history.chart.label = [];
            coinsObj[item].is.chartRefresh = false;
        });
        //this.isLiveLoading = true;

        this.fetchPoolDataService.live({ coin: activeCoin, type: 'pool' });
    }

    private processCoins() {
        const coinI = this.storageService.coinsList.length > 2 ? this.storageService.coinsList.length - 1 : 0;
        this.mainChartCoin = this.storageService.coinsList[coinI];
        //this.getLiveInfo();
        this.historyFetcher();
        this.blocksFetch();
    }
    private processLive(coin: string) {
        if (this.isStarting) this.isStarting = false;
        this.isLiveLoading = false;
        this.getHistoryInfo(coin);
        const coinObj = this.storageService.coinsObj[coin];
        if (!coinObj.is.liveVisible) return;
        this.liveStats = coinObj.live.data as any;
    }
    private processBlocks(coin: string) {
        this.isBlocksLoading = false;
        const coinObj = this.storageService.coinsObj[coin];
        if (!coinObj.is.blocksVisible) return;
        coinObj.blocks.data.forEach(blk => {
            if (blk.confirmations === -1) blk.confirmations = 'ORPHAN';
            if (blk.confirmations === -2) blk.confirmations = 'node_err';
            if (blk.confirmations === 0) blk.confirmations = 'NEW';
            //blk.generatedCoins=blk.generatedCoins.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
        });
        if (coin == this.storageService.currCoin) {
            this.blocks = coinObj.blocks.data;
            this.getPoolLuck(coin);
        }
    }

    //
    private changeMainChartCoin(coin: string) {
        const coinsObj = this.storageService.coinsObj;
        const mainChartCoin = this.storageService.chartMainCoinName;

        this.storageService.chartMainCoinName = coin
        coinsObj[coin].is.chartRefresh = true;

        coinsObj[coin].history.data = [];
        coinsObj[coin].history.chart.data = [];
        coinsObj[coin].history.chart.label = [];
        coinsObj[coin].history.timeFrom = coinsObj[mainChartCoin].history.timeFrom;
        coinsObj[coin].history.grByInterval = coinsObj[mainChartCoin].history.grByInterval;

        const coins = this.storageService.coinsList.filter(item => item !== coin);

        coins.forEach(item => {
            coinsObj[item].is.chartRefresh = false;
            coinsObj[item].history.data = [];
            coinsObj[item].history.chart.data = [];
            coinsObj[item].history.chart.label = [];
            coinsObj[item].history.timeFrom = coinsObj[mainChartCoin].history.timeFrom;
            coinsObj[item].history.grByInterval = coinsObj[mainChartCoin].history.grByInterval;
        });
        this.isLiveLoading = true;
        this.fetchPoolDataService.live({ coin: coin, type: 'pool' });
        this.mainChartCoin = coin;
    }

    private getLiveInfo() {
        const coinObj = this.storageService.coinsObj;
        const list = this.storageService.coinsList.filter(coin => {
            return coinObj[coin].is.chartRefresh && !coinObj[coin].live.isLoading;
        });
        list.forEach(coin => {
            if (coinObj[coin].is.liveVisible) this.isLiveLoading = true;
            this.fetchPoolDataService.live({ coin, type: 'pool' });
        });
    }
    private getHistoryInfo(coin: string) {
        const info = this.storageService.coinsObj[coin];
        if (info.history.isLoading || !info.is.chartRefresh) return;
        info.history.isLoading = true;
        this.fetchPoolDataService.history({ coin, type: 'pool' });
    }
    private getBloksInfo() {
        const coinObj = this.storageService.coinsObj;
        const list = this.storageService.coinsList.filter(coin => {
            return !coinObj[coin].is.algo && !coinObj[coin].blocks.isLoading && coinObj[coin].is.blocksVisible;
        });
        list.forEach(coin => {
            this.blocks = [];
            coinObj[coin].blocks.isLoading = true;
            this.isBlocksLoading = true;
            this.fetchPoolDataService.blocks({ coin, type: 'pool' });
        });
    }

    private blocksFetch(timer: number = DefaultParams.BLOCKSFETCHTIMER) {
        clearTimeout(this.blocksFetcherTimeoutId);
        this.blocksFetcherTimeoutId = setTimeout(() => {
            this.getBloksInfo();
            this.blocksFetch(timer);
        }, timer * 1000);
    }

    private historyFetcher(timer: number = DefaultParams.ZOOMPARAMS[this.storageService.currZoom].refreshTimer) {
        clearTimeout(this.historyFetcherTimeoutId);
        this.historyFetcherTimeoutId = setTimeout(() => {
            this.getLiveInfo();
            this.historyFetcher();
        }, timer * 1000);
    }

    private setMainCoinTimer(coin: string, timer: number = DefaultParams.BASECOINSWITCHTIMER) {
        clearTimeout(this.changeMainChartCoinTimeoutId);
        this.changeMainChartCoinTimeoutId = setTimeout(() => {
            //this.processZoomChange(this.storageService.currZoom);
            //clearTimeout(this.changeMainChartCoinTimeoutId);
            this.changeMainChartCoin(coin);
        }, timer * 1000);
    }
}
