import generatePrimes from './utils/generatePrimes';

interface OptionsInterface {
  skuPropGroups: SKUPropGroupInterface[];
  skus: SKUInterface[];
  skuIdKey?: string;
  skuPropValueKey?: string;
  getSKUPropsOfGroup(skuPropGroup: SKUPropGroupInterface): SKUPropInterface[];
  getSKUPropValuesOfSKU(sku: SKUInterface): SKUPropValueType[];
}

interface SKUPropGroupInterface {
  group: any;
  skuProps: SKUPropInterface[];
}

interface SKUInterface {
  [key: string]: any;
}

interface SKUPropInterface {
  [key: string]: SKUPropValueType;
}

type SKUPropValueType = string | number;
type SKUIdType = string | number;

const DEFAULT_OPTIONS = {
  skuIdKey: 'id',
  skuPropValueKey: 'value',
};

export default class SKUSelect {
  skuPropGroups: SKUPropGroupInterface[] = [];
  skus: SKUInterface[] = [];

  private options: OptionsInterface & {
    skuIdKey: string;
    skuPropValueKey: string;
  };
  private selectedSKUPropValues: (SKUPropValueType | undefined)[] = [];
  private primeBySKUPropValue: { [skuPropValue: SKUPropValueType]: number } =
    {};
  private primeGroups: number[][] = [];
  private skuIdPrimesProductEntries: [
    skuId: SKUIdType,
    primesProduct: number,
  ][] = [];

  constructor(options: OptionsInterface) {
    const { skuPropGroups, skus = [] } = options;

    this.options = Object.assign({}, DEFAULT_OPTIONS, options);
    this.skuPropGroups = skuPropGroups;
    this.skus = skus;
    this.primeBySKUPropValue = this.buildPrimeBySKUPropValue({ skuPropGroups });
    this.skuIdPrimesProductEntries = this.buildSKUIdPrimesProductEntries({
      skus,
    });
    this.primeGroups = this.buildPrimeGroups({ skuPropGroups });
    this.selectedSKUPropValues = skuPropGroups.map(() => undefined);
  }

  private buildPrimeBySKUPropValue({
    skuPropGroups,
  }: {
    skuPropGroups: SKUPropGroupInterface[];
  }): {
    [skuPropValue: SKUPropValueType]: number;
  } {
    const skuProps: SKUPropInterface[] = skuPropGroups.reduce(
      (skuProps, skuPropGroup) => [
        ...skuProps,
        ...(this.options.getSKUPropsOfGroup(skuPropGroup) || []),
      ],
      [] as SKUPropInterface[],
    );
    const primes = generatePrimes(skuProps.length);

    return Object.fromEntries(
      skuProps.map((skuProp, index) => [
        skuProp[this.options.skuPropValueKey],
        primes[index],
      ]),
    );
  }

  private buildSKUIdPrimesProductEntries({
    skus = [],
  }: {
    skus: SKUInterface[];
  }): [skuId: SKUIdType, primesProduct: number][] {
    return skus.map((sku) => {
      const skuPropValuesOfSKU = this.options.getSKUPropValuesOfSKU(sku) || [];
      const skuPrimesProduct = skuPropValuesOfSKU
        .map((skuPropValue) => this.primeBySKUPropValue[skuPropValue])
        .reduce(
          (primesProduct: number, skuPropValueOfSKU: number) =>
            primesProduct * skuPropValueOfSKU,
          1,
        );

      return [sku[this.options.skuIdKey], skuPrimesProduct];
    });
  }

  private buildPrimeGroups({
    skuPropGroups,
  }: {
    skuPropGroups: SKUPropGroupInterface[];
  }): number[][] {
    return skuPropGroups.map((skuPropGroup) => {
      const skuProps = this.options.getSKUPropsOfGroup(skuPropGroup);
      return skuProps.map((skuProp) => {
        const skuPropValue = skuProp[this.options.skuPropValueKey];
        return this.primeBySKUPropValue[skuPropValue];
      });
    });
  }

  private getSelectedPrimesProduct() {
    const selectedPrimes = this.selectedSKUPropValues
      .filter((skuPropValue) => typeof skuPropValue !== 'undefined')
      .map((skuPropValue) => this.primeBySKUPropValue[skuPropValue!]);

    return selectedPrimes.reduce((product, prime) => product * prime, 1);
  }

  private findGroupIndexOfSKUProp(skuPropValue: SKUPropValueType): number {
    return this.primeGroups.findIndex((group) => {
      const prime = this.primeBySKUPropValue[skuPropValue];
      return group.indexOf(prime) >= 0;
    });
  }

  private mapSKUPropValuesToPrimes(
    skuPropValues: SKUPropValueType[],
  ): number[] {
    return skuPropValues.map(
      (skuPropValue) => this.primeBySKUPropValue[skuPropValue],
    );
  }

  checkIsSKUPropSelected(skuPropValue: SKUPropValueType): boolean {
    return this.selectedSKUPropValues.includes(skuPropValue);
  }

  checkIsSKUPropDisabled(skuPropValue: SKUPropValueType): boolean {
    let result = false;
    const selectedSKUPropValues = this.selectedSKUPropValues.filter(
      (skuPropValue) => typeof skuPropValue !== 'undefined',
    );
    const selectedPrimes = this.mapSKUPropValuesToPrimes(
      selectedSKUPropValues as SKUPropValueType[],
    );
    const prime = this.primeBySKUPropValue[skuPropValue];
    const groupIndex = this.findGroupIndexOfSKUProp(skuPropValue);

    for (
      let currentGroupIndex = 0;
      currentGroupIndex < this.selectedSKUPropValues.length;
      currentGroupIndex++
    ) {
      const isSKUGroupNotSelected =
        typeof this.selectedSKUPropValues[currentGroupIndex] === 'undefined';
      const isInSameSKUGroup = groupIndex === currentGroupIndex;

      if (isSKUGroupNotSelected || isInSameSKUGroup) continue;

      const isDisabled = !selectedPrimes
        .flatMap((selectedPrime) => {
          return this.skuIdPrimesProductEntries.map(
            /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
            ([skuId, primesProduct]) =>
              primesProduct % (selectedPrime * prime) === 0,
          );
        })
        .filter(Boolean).length;

      if (isDisabled) {
        result = true;
        break;
      }
    }

    return result;
  }

  selectSKUProp(skuPropValue: SKUPropValueType): void {
    const isSelected = this.checkIsSKUPropSelected(skuPropValue);
    const groupIndex = this.findGroupIndexOfSKUProp(skuPropValue);

    this.selectedSKUPropValues.splice(
      groupIndex,
      1,
      isSelected ? undefined : skuPropValue,
    );
  }

  getSelectedSKU(): SKUInterface | undefined {
    const selectedPrimesProduct = this.getSelectedPrimesProduct();
    const selectedSKUId = this.skuIdPrimesProductEntries.find(
      /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
      ([skuId, primesProduct]) => primesProduct === selectedPrimesProduct,
    )?.[0];

    return this.skus.find((sku) => {
      const skuId = sku[this.options.skuIdKey];

      return selectedSKUId === skuId;
    });
  }
}
