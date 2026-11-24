import {
  buildLineupForFormation,
  calculateDynamicOVR,
  calculatePlayerInterest,
  calculateTransferRoomXTV,
  calculateWeeklyWageEur,
  clamp,
  formatMoney,
} from './ratings.ts';
import {
  CareerState,
  Club,
  InstallmentObligation,
  NegotiationOffer,
  Player,
  SquadRole,
  TransferNegotiation,
  TransferRecord,
} from './types.ts';

function roundFee(val: number): number {
  if (val >= 10_000_000) return Math.round(val / 200_000) * 200_000;
  if (val >= 1_000_000) return Math.round(val / 50_000) * 50_000;
  return Math.max(100_000, Math.round(val / 25_000) * 25_000);
}

export function computeOfferPayments(feeEur: number, instalments: 1 | 2 | 3 | 4): {
  paidNowEur: number;
  futurePaymentsEur: number;
} {
  if (instalments === 1) {
    return { paidNowEur: feeEur, futurePaymentsEur: 0 };
  }
  // FC 27 style split: 60% upfront on 2 instalments, 50% on 3, 40% on 4
  const upfrontPct = instalments === 2 ? 0.6 : instalments === 3 ? 0.5 : 0.4;
  const paidNowEur = Math.round(feeEur * upfrontPct);
  return { paidNowEur, futurePaymentsEur: Math.max(0, feeEur - paidNowEur) };
}

export function initiateNegotiation(
  state: CareerState,
  playerId: number,
  type: TransferNegotiation['type']
): { negotiation: TransferNegotiation | null; error?: string } {
  const player = state.players[playerId];
  const userClub = state.clubs[state.userClubId];
  if (!player || !userClub) return { negotiation: null, error: 'Player or club not found.' };

  const existing = state.negotiations.find(
    (n) =>
      n.playerId === playerId &&
      n.stage !== 'COMPLETED' &&
      n.stage !== 'COLLAPSED' &&
      n.stage !== 'REJECTED'
  );
  if (existing) {
    return { negotiation: existing };
  }

  const sellerClub = state.clubs[player.clubId];
  const rel = sellerClub ? sellerClub.relationships[userClub.id] ?? 4 : 4;
  const isRival = sellerClub ? sellerClub.rivalClubIds.includes(userClub.id) : false;

  if (type === 'CONTRACT') {
    const desiredWage = Math.round(
      Math.max(player.weeklyWageEur * 1.12, calculateWeeklyWageEur(player.dynamicOvr.dynamicOvr, player.age, userClub.domesticPrestige)) /
        500
    ) * 500;
    const desiredYears = player.age >= 32 ? 2 : player.age >= 29 ? 3 : 4;
    const neg: TransferNegotiation = {
      id: `neg-${player.id}-${Date.now()}`,
      type: 'CONTRACT',
      playerId: player.id,
      fromClubId: userClub.id,
      toClubId: userClub.id,
      counterpartManager: `${player.knownAs}'s Agent`,
      counterpartClubName: userClub.name,
      stage: 'PLAYER_TALKS',
      tension: 18,
      daysOpen: 0,
      lastUpdatedDate: state.currentDate,
      askingFeeEur: 0,
      askingWageEur: desiredWage,
      desiredRole: player.squadRole,
      desiredYears,
      currentOffer: {
        startDate: 'IMMEDIATE',
        transferFeeEur: 0,
        instalments: 1,
        paidNowEur: 0,
        futurePaymentsEur: 0,
        exchangePlayerId: null,
        achievementBonusEur: 0,
        sellOnClausePct: 0,
        wageEur: desiredWage,
        contractYears: desiredYears,
        squadRole: player.squadRole,
        signingBonusEur: Math.round(desiredWage * 6),
        releaseClauseEur: player.releaseClauseEur,
      },
      managerDialogue: `My client loves representing ${userClub.name}. Let's agree on ${formatMoney(desiredWage, state.settings.currency)}/wk over ${desiredYears} years.`,
      scoutRecommendation: `Recommended renewal: ${formatMoney(desiredWage, state.settings.currency)}/wk (${player.squadRole}).`,
      history: [{ date: state.currentDate, actor: 'Agent', message: 'Opened contract renewal talks.' }],
    };
    return { negotiation: neg };
  }

  // BUY or LOAN_IN approach
  const xtv = player.expectedTransferValue;
  const relMarkup = isRival ? 1.32 : rel >= 7 ? 1.06 : rel <= 1 ? 1.24 : 1.15;
  const askingFeeEur = roundFee(xtv * (player.transferListed ? 0.92 : relMarkup));
  const initialOfferFee = roundFee(askingFeeEur);
  const { paidNowEur, futurePaymentsEur } = computeOfferPayments(initialOfferFee, 1);

  const desiredWage =
    Math.round(
      Math.max(player.weeklyWageEur * 1.1, calculateWeeklyWageEur(player.baseOvr, player.age, userClub.domesticPrestige)) /
        500
    ) * 500;
  const desiredRole: SquadRole =
    player.baseOvr >= 84 ? 'Crucial' : player.baseOvr >= 78 ? 'Important' : player.age <= 20 ? 'Prospect' : 'Rotation';
  const desiredYears = player.age >= 31 ? 2 : 4;

  // Rarely a bitter rival refuses an outright enquiry on their Crucial star
  const instantReject = isRival && player.squadRole === 'Crucial' && player.baseOvr >= 88 && !player.transferListed;

  const neg: TransferNegotiation = {
    id: `neg-${player.id}-${Date.now()}`,
    type,
    playerId: player.id,
    fromClubId: player.clubId,
    toClubId: userClub.id,
    counterpartManager: sellerClub?.managerName ?? 'Sporting Director',
    counterpartClubName: sellerClub?.name ?? player.clubName,
    stage: instantReject ? 'REJECTED' : 'CLUB_TALKS',
    tension: isRival ? 46 : 20,
    daysOpen: 0,
    lastUpdatedDate: state.currentDate,
    askingFeeEur,
    askingWageEur: desiredWage,
    desiredRole,
    desiredYears,
    currentOffer: {
      startDate: state.transferWindowOpen ? 'IMMEDIATE' : 'NEXT_WINDOW',
      transferFeeEur: initialOfferFee,
      instalments: 1,
      paidNowEur,
      futurePaymentsEur,
      exchangePlayerId: null,
      achievementBonusEur: 0,
      sellOnClausePct: 0,
      wageEur: desiredWage,
      contractYears: desiredYears,
      squadRole: desiredRole,
      signingBonusEur: Math.round(desiredWage * 8),
      releaseClauseEur: Math.round(askingFeeEur * 1.9),
    },
    managerDialogue: instantReject
      ? `We will never sell ${player.knownAs} to a direct rival. The club is not willing to negotiate.`
      : `Happy to see you. We would be willing to sell ${player.knownAs} for a deal worth ${formatMoney(askingFeeEur, state.settings.currency)}.`,
    scoutRecommendation: `TransferRoom xTV values ${player.knownAs} at ${formatMoney(xtv, state.settings.currency)}. Fair opening range: ${formatMoney(roundFee(xtv * 0.96), state.settings.currency)} – ${formatMoney(roundFee(xtv * 1.15), state.settings.currency)}.`,
    history: [
      {
        date: state.currentDate,
        actor: sellerClub?.managerName ?? 'Club',
        message: instantReject ? 'Enquiry rejected immediately.' : `Initial valuation set at ${formatMoney(askingFeeEur, state.settings.currency)}.`,
      },
    ],
  };

  return { negotiation: neg };
}

export function evaluateClubOffer(
  state: CareerState,
  negotiation: TransferNegotiation,
  offer: NegotiationOffer,
  rng: () => number = Math.random
): { updated: TransferNegotiation; clubRelationDelta: number } {
  const player = state.players[negotiation.playerId];
  const userClub = state.clubs[state.userClubId];
  const exchangePlayer = offer.exchangePlayerId ? state.players[offer.exchangePlayerId] : null;
  const exchangeValue = exchangePlayer ? Math.round(exchangePlayer.expectedTransferValue * 0.88) : 0;

  // Instalments carry a slight time-value discount; achievement bonus & sell-on clause add effective value
  const instalmentFactor = offer.instalments === 1 ? 1.0 : offer.instalments === 2 ? 0.96 : offer.instalments === 3 ? 0.92 : 0.88;
  const sellOnValue = Math.round(negotiation.askingFeeEur * (offer.sellOnClausePct / 100) * 0.45);
  const bonusValue = Math.round(offer.achievementBonusEur * 0.55);

  const effectiveTotal = Math.round(offer.transferFeeEur * instalmentFactor) + exchangeValue + bonusValue + sellOnValue;
  const ratio = effectiveTotal / Math.max(1, negotiation.askingFeeEur);

  const { paidNowEur, futurePaymentsEur } = computeOfferPayments(offer.transferFeeEur, offer.instalments);
  const cleanOffer: NegotiationOffer = { ...offer, paidNowEur, futurePaymentsEur };

  let tension = negotiation.tension;
  let stage = negotiation.stage;
  let askingFeeEur = negotiation.askingFeeEur;
  let dialogue = '';
  let relDelta = 0;

  if (negotiation.type === 'SELL') {
    // User is selling to an AI club; offer.transferFeeEur is user's counter demand
    const buyerMax = roundFee(negotiation.askingFeeEur * 1.18);
    if (offer.transferFeeEur <= buyerMax) {
      stage = 'COMPLETED';
      dialogue = `Agreed! We accept ${formatMoney(offer.transferFeeEur, state.settings.currency)} for ${player.knownAs}. Paperwork is being finalized.`;
      relDelta = 1;
    } else if (offer.transferFeeEur <= buyerMax * 1.18) {
      tension = clamp(tension + 26, 0, 100);
      askingFeeEur = roundFee((negotiation.askingFeeEur + buyerMax) / 2);
      if (tension >= 92) {
        stage = 'COLLAPSED';
        dialogue = `That valuation is far beyond our ceiling. We are walking away from talks.`;
        relDelta = -1;
      } else {
        dialogue = `That's steep. Our revised bid is ${formatMoney(askingFeeEur, state.settings.currency)}. Can we meet there?`;
      }
    } else {
      stage = 'COLLAPSED';
      tension = 100;
      dialogue = `Unrealistic asking price. Negotiations are terminated.`;
      relDelta = -2;
    }
  } else {
    // User is buying from an AI club
    if (paidNowEur > userClub.transferBudgetEur) {
      return {
        updated: {
          ...negotiation,
          currentOffer: cleanOffer,
          managerDialogue: `Your upfront payment (${formatMoney(paidNowEur, state.settings.currency)}) exceeds your remaining transfer budget (${formatMoney(userClub.transferBudgetEur, state.settings.currency)}). Try adding instalments or lowering the fee.`,
        },
        clubRelationDelta: 0,
      };
    }

    if (ratio >= 0.96) {
      stage = 'PLAYER_TALKS';
      tension = clamp(tension - 12, 5, 100);
      dialogue = `We have a club-to-club agreement for ${player.knownAs} at ${formatMoney(offer.transferFeeEur, state.settings.currency)}. You now have permission to negotiate personal terms with his agent.`;
      relDelta = 1;
    } else if (ratio >= 0.84) {
      tension = clamp(tension + 20, 0, 100);
      // Seller compromises slightly downward toward offer
      askingFeeEur = roundFee(askingFeeEur * 0.94 + offer.transferFeeEur * 0.06);
      if (tension >= 90) {
        stage = 'COLLAPSED';
        dialogue = `We've been going in circles for too long. ${player.knownAs} is staying with us.`;
        relDelta = -1;
      } else {
        dialogue = `We're getting closer, but ${formatMoney(offer.transferFeeEur, state.settings.currency)} is still short. Come up to ${formatMoney(askingFeeEur, state.settings.currency)} and we have a deal.`;
      }
    } else if (ratio >= 0.7) {
      tension = clamp(tension + 34, 0, 100);
      if (tension >= 90) {
        stage = 'COLLAPSED';
        dialogue = `That offer is insulting given ${player.knownAs}'s TransferRoom valuation. Call ended.`;
        relDelta = -2;
      } else {
        dialogue = `Not even close to our valuation. We need at least ${formatMoney(askingFeeEur, state.settings.currency)} to let him leave.`;
      }
    } else {
      tension = 100;
      stage = 'COLLAPSED';
      dialogue = `We will not entertain lowball bids like ${formatMoney(offer.transferFeeEur, state.settings.currency)}. Negotiations are over.`;
      relDelta = -2;
    }

    // Small chance a rival club enters with a hijack bid when talks heat up on high-profile players
    if (stage === 'CLUB_TALKS' && player.baseOvr >= 80 && !negotiation.rivalClubId && rng() < 0.22) {
      const rivals = Object.values(state.clubs).filter(
        (c) => c.isLaLiga && c.id !== userClub.id && c.id !== player.clubId && c.transferBudgetEur >= askingFeeEur * 0.7
      );
      if (rivals.length > 0) {
        const hijacker = rivals[Math.floor(rng() * rivals.length)];
        const rivalBid = roundFee(askingFeeEur * 1.03);
        negotiation = {
          ...negotiation,
          rivalClubId: hijacker.id,
          rivalClubName: hijacker.name,
          rivalBidEur: rivalBid,
        };
        dialogue = `Heads up — ${hijacker.name} just tabled ${formatMoney(rivalBid, state.settings.currency)} for ${player.knownAs}! Match our ${formatMoney(askingFeeEur, state.settings.currency)} demand soon or we'll sell to them.`;
      }
    }
  }

  const updated: TransferNegotiation = {
    ...negotiation,
    stage,
    tension,
    askingFeeEur,
    currentOffer: cleanOffer,
    lastUpdatedDate: state.currentDate,
    managerDialogue: dialogue,
    history: [
      ...negotiation.history,
      {
        date: state.currentDate,
        actor: userClub.shortName,
        message: `Proposed ${formatMoney(offer.transferFeeEur, state.settings.currency)} (${offer.instalments} inst.${exchangePlayer ? ` + ${exchangePlayer.knownAs}` : ''}).`,
      },
      { date: state.currentDate, actor: negotiation.counterpartManager, message: dialogue },
    ],
  };

  return { updated, clubRelationDelta: relDelta };
}

export function evaluateContractOffer(
  state: CareerState,
  negotiation: TransferNegotiation,
  offer: NegotiationOffer
): TransferNegotiation {
  const player = state.players[negotiation.playerId];
  const userClub = state.clubs[state.userClubId];
  const sellerClub = state.clubs[player.clubId];
  const interest = calculatePlayerInterest(player, userClub, sellerClub, offer.squadRole, offer.wageEur);

  const wageRatio = offer.wageEur / Math.max(1, negotiation.askingWageEur);
  const bonusBoost = offer.signingBonusEur >= negotiation.askingWageEur * 10 ? 0.06 : 0;
  const roleOrder: SquadRole[] = ['Prospect', 'Sporadic', 'Rotation', 'Important', 'Crucial'];
  const roleDelta = roleOrder.indexOf(offer.squadRole) - roleOrder.indexOf(negotiation.desiredRole);

  const effectiveScore = wageRatio + bonusBoost + roleDelta * 0.08 + (interest.score - 55) * 0.0025;

  let stage = negotiation.stage;
  let tension = negotiation.tension;
  let dialogue = '';

  if (effectiveScore >= 0.96) {
    stage = 'COMPLETED';
    tension = clamp(tension - 15, 0, 100);
    dialogue = `We have a full agreement! ${player.knownAs} is delighted to sign a ${offer.contractYears}-year contract on ${formatMoney(offer.wageEur, state.settings.currency)}/wk as a ${offer.squadRole} player.`;
  } else if (effectiveScore >= 0.84) {
    tension = clamp(tension + 24, 0, 100);
    if (tension >= 92) {
      stage = 'COLLAPSED';
      dialogue = `We cannot bridge the gap on personal terms. ${player.knownAs} is ending talks.`;
    } else {
      dialogue = `My client expects closer to ${formatMoney(negotiation.askingWageEur, state.settings.currency)}/wk and a ${negotiation.desiredRole} role to put pen to paper.`;
    }
  } else {
    tension = clamp(tension + 42, 0, 100);
    if (tension >= 90) {
      stage = 'COLLAPSED';
      dialogue = `That salary package is unacceptable. We are leaving the negotiating table.`;
    } else {
      dialogue = `We are quite far apart on wages. Increase the offer toward ${formatMoney(negotiation.askingWageEur, state.settings.currency)}/wk or improve his squad role.`;
    }
  }

  return {
    ...negotiation,
    stage,
    tension,
    currentOffer: offer,
    lastUpdatedDate: state.currentDate,
    managerDialogue: dialogue,
    history: [
      ...negotiation.history,
      {
        date: state.currentDate,
        actor: userClub.shortName,
        message: `Offered ${formatMoney(offer.wageEur, state.settings.currency)}/wk, ${offer.contractYears}y (${offer.squadRole}).`,
      },
      { date: state.currentDate, actor: 'Agent', message: dialogue },
    ],
  };
}

export function buildTransferShowcase(
  player: Player,
  fromClub: Club,
  toClub: Club,
  feeEur: number,
  instalments: number,
  futureDueEur: number,
  sellOnPct: number,
  date: string,
  isUserDeal: boolean
): TransferRecord {
  const headline =
    feeEur >= 60_000_000
      ? `BLOCKBUSTER: ${toClub.name} complete ${formatMoney(feeEur)} signing of ${player.knownAs}!`
      : `DONE DEAL: ${player.knownAs} joins ${toClub.name} from ${fromClub.name} for ${formatMoney(feeEur)}`;

  const socialComments = [
    {
      handle: `@${toClub.shortName.toLowerCase()}_insider`,
      text: `Statement signing! ${player.knownAs} (${player.dynamicOvr.dynamicOvr} OVR) transforms our ${player.primaryPosition} options immediately.`,
      likes: 1840 + player.baseOvr * 34,
    },
    {
      handle: `@TransferRoomLive`,
      text: `xTV Analysis: ${formatMoney(feeEur)} fee vs ${formatMoney(player.expectedTransferValue)} xTV — ${
        feeEur <= player.expectedTransferValue * 1.05 ? 'shrewd value for the board.' : 'premium paid to beat market rivals.'
      }`,
      likes: 920 + player.baseOvr * 19,
    },
    {
      handle: `@LaLigaTactics`,
      text: `${toClub.managerName} gets ${/^[AEIOU]/i.test(player.roleTitle) ? 'an' : 'a'} ${player.roleTitle} who fits ${toClub.tacticalVision} seamlessly.`,
      likes: 640 + player.baseOvr * 11,
    },
  ];

  return {
    id: `tr-${player.id}-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    date,
    playerId: player.id,
    playerName: player.knownAs,
    position: player.primaryPosition,
    ovr: player.baseOvr,
    fromClubId: fromClub.id,
    fromClubName: fromClub.name,
    toClubId: toClub.id,
    toClubName: toClub.name,
    feeEur,
    instalments,
    futureDueEur,
    sellOnPct,
    isUserDeal,
    pressHeadline: headline,
    socialComments,
  };
}

export function completeTransferInState(
  state: CareerState,
  negotiation: TransferNegotiation
): {
  clubs: Record<number, Club>;
  players: Record<number, Player>;
  transferRecord: TransferRecord | null;
  installment: InstallmentObligation | null;
} {
  const player = state.players[negotiation.playerId];
  const fromClub = state.clubs[negotiation.fromClubId];
  const toClub = state.clubs[negotiation.toClubId];
  if (!player || !fromClub || !toClub) {
    return { clubs: state.clubs, players: state.players, transferRecord: null, installment: null };
  }

  const clubs = { ...state.clubs };
  const players = { ...state.players };
  const offer = negotiation.currentOffer;
  const currentYear = parseInt(state.currentDate.slice(0, 4), 10) || 2026;

  // Contract renewal only
  if (negotiation.type === 'CONTRACT') {
    const renewed: Player = {
      ...player,
      weeklyWageEur: offer.wageEur,
      squadRole: offer.squadRole,
      contractEndYear: currentYear + offer.contractYears,
      releaseClauseEur: offer.releaseClauseEur,
      morale: clamp(player.morale + 10, 0, 92),
    };
    renewed.expectedTransferValue = calculateTransferRoomXTV(
      renewed.baseOvr,
      renewed.dynamicOvr.dynamicOvr,
      renewed.potential,
      renewed.age,
      offer.contractYears,
      renewed.primaryPosition,
      renewed.formScore
    );
    renewed.dynamicOvr = calculateDynamicOVR(renewed, renewed.dynamicOvr.deployedPosition, 0);
    players[player.id] = renewed;
    clubs[toClub.id] = {
      ...toClub,
      transferBudgetEur: Math.max(0, toClub.transferBudgetEur - offer.signingBonusEur),
    };
    return { clubs, players, transferRecord: null, installment: null };
  }

  const { paidNowEur, futurePaymentsEur } = computeOfferPayments(offer.transferFeeEur, offer.instalments);

  // Move main player
  const movedPlayer: Player = {
    ...player,
    clubId: toClub.id,
    clubName: toClub.name,
    isExternalClub: !toClub.isLaLiga,
    transferListed: false,
    loanListed: false,
    weeklyWageEur: offer.wageEur || player.weeklyWageEur,
    squadRole: offer.squadRole || player.squadRole,
    contractEndYear: currentYear + (offer.contractYears || 4),
    joinDate: state.currentDate,
    morale: 78,
  };
  movedPlayer.dynamicOvr = calculateDynamicOVR(movedPlayer, movedPlayer.primaryPosition, 0);
  players[player.id] = movedPlayer;

  // Handle exchange player if included
  if (offer.exchangePlayerId && players[offer.exchangePlayerId]) {
    const ex = players[offer.exchangePlayerId];
    players[ex.id] = {
      ...ex,
      clubId: fromClub.id,
      clubName: fromClub.name,
      isExternalClub: !fromClub.isLaLiga,
      transferListed: false,
      morale: 72,
    };
  }

  // Update budgets & rebuild affected lineups safely
  const rebuildClub = (c: Club, budgetDelta: number): Club => {
    const roster = Object.values(players).filter((p) => p.clubId === c.id);
    if (!c.isLaLiga) {
      return { ...c, transferBudgetEur: Math.max(0, c.transferBudgetEur + budgetDelta) };
    }
    const { lineup, benchIds } = buildLineupForFormation(c.formation, roster);
    return {
      ...c,
      transferBudgetEur: Math.max(0, c.transferBudgetEur + budgetDelta),
      lineup,
      benchIds,
    };
  };

  clubs[toClub.id] = rebuildClub(toClub, -(paidNowEur + (offer.signingBonusEur || 0)));
  clubs[fromClub.id] = rebuildClub(fromClub, paidNowEur);

  const isUserDeal = toClub.id === state.userClubId || fromClub.id === state.userClubId;
  const transferRecord = buildTransferShowcase(
    movedPlayer,
    fromClub,
    toClub,
    offer.transferFeeEur,
    offer.instalments,
    futurePaymentsEur,
    offer.sellOnClausePct,
    state.currentDate,
    isUserDeal
  );

  let installment: InstallmentObligation | null = null;
  if (isUserDeal && (futurePaymentsEur > 0 || offer.sellOnClausePct > 0)) {
    const seasonsRemaining = Math.max(1, offer.instalments - 1);
    installment = {
      id: `inst-${player.id}-${Date.now()}`,
      playerId: player.id,
      playerName: player.knownAs,
      counterpartClubName: toClub.id === state.userClubId ? fromClub.name : toClub.name,
      direction: toClub.id === state.userClubId ? 'PAYABLE' : 'RECEIVABLE',
      amountPerSeasonEur: Math.round(futurePaymentsEur / seasonsRemaining),
      seasonsRemaining: futurePaymentsEur > 0 ? seasonsRemaining : 0,
      sellOnPct: offer.sellOnClausePct,
    };
  }

  return { clubs, players, transferRecord, installment };
}

/**
 * AI-to-AI transfers and incoming AI bids for User's transfer-listed or standout players during open windows.
 */
export function runDailyAiTransferMarket(
  state: CareerState,
  rng: () => number = Math.random
): {
  clubs: Record<number, Club>;
  players: Record<number, Player>;
  newNegotiations: TransferNegotiation[];
  newRecords: TransferRecord[];
} {
  if (!state.transferWindowOpen) {
    return { clubs: state.clubs, players: state.players, newNegotiations: [], newRecords: [] };
  }

  let clubs = state.clubs;
  let players = state.players;
  const newNegotiations: TransferNegotiation[] = [];
  const newRecords: TransferRecord[] = [];
  const userClub = clubs[state.userClubId];

  // 1. Incoming AI bid for User's transfer-listed (or standout) player (~14% daily chance when <3 active sell talks)
  const activeSellTalks = state.negotiations.filter(
    (n) => n.type === 'SELL' && n.stage !== 'COMPLETED' && n.stage !== 'COLLAPSED' && n.stage !== 'REJECTED'
  );
  if (activeSellTalks.length < 3 && rng() < (state.deadlineDayHoursRemaining !== null ? 0.35 : 0.14)) {
    const userSquad = Object.values(players).filter((p) => p.clubId === userClub.id && !p.injury);
    const candidates = userSquad.filter(
      (p) =>
        !p.offersBlocked &&
        (p.transferListed || (p.baseOvr >= 76 && rng() < 0.35)) &&
        !state.negotiations.some((n) => n.playerId === p.id && n.stage !== 'COLLAPSED')
    );
    if (candidates.length > 0) {
      const target = candidates[Math.floor(rng() * candidates.length)];
      const bidders = Object.values(clubs).filter(
        (c) =>
          c.id !== userClub.id &&
          c.transferBudgetEur >= target.expectedTransferValue * 0.8 &&
          !c.rivalClubIds.includes(userClub.id)
      );
      if (bidders.length > 0) {
        const buyer = bidders[Math.floor(rng() * bidders.length)];
        const bidFee = roundFee(target.expectedTransferValue * (0.94 + rng() * 0.22));
        const { paidNowEur, futurePaymentsEur } = computeOfferPayments(bidFee, 1);
        newNegotiations.push({
          id: `neg-sell-${target.id}-${Date.now()}-${Math.floor(rng() * 999)}`,
          type: 'SELL',
          playerId: target.id,
          fromClubId: userClub.id,
          toClubId: buyer.id,
          counterpartManager: buyer.managerName,
          counterpartClubName: buyer.name,
          stage: 'CLUB_TALKS',
          tension: 16,
          daysOpen: 0,
          lastUpdatedDate: state.currentDate,
          askingFeeEur: bidFee,
          askingWageEur: target.weeklyWageEur,
          desiredRole: target.squadRole,
          desiredYears: 4,
          currentOffer: {
            startDate: 'IMMEDIATE',
            transferFeeEur: bidFee,
            instalments: 1,
            paidNowEur,
            futurePaymentsEur,
            exchangePlayerId: null,
            achievementBonusEur: 0,
            sellOnClausePct: 0,
            wageEur: Math.round(target.weeklyWageEur * 1.15),
            contractYears: 4,
            squadRole: 'Important',
            signingBonusEur: 0,
            releaseClauseEur: Math.round(bidFee * 2),
          },
          managerDialogue: `We are interested in signing ${target.knownAs}. ${buyer.name} are prepared to offer ${formatMoney(bidFee, state.settings.currency)}.`,
          scoutRecommendation: `TransferRoom xTV is ${formatMoney(target.expectedTransferValue, state.settings.currency)}. You can accept or negotiate up to ~${formatMoney(roundFee(bidFee * 1.16), state.settings.currency)}.`,
          history: [
            {
              date: state.currentDate,
              actor: buyer.name,
              message: `Submitted transfer bid of ${formatMoney(bidFee, state.settings.currency)} for ${target.knownAs}.`,
            },
          ],
        });
      }
    }
  }

  // 2. AI-to-AI completed deal (~20% daily chance during window so the league transfer market feels alive)
  if (rng() < (state.deadlineDayHoursRemaining !== null ? 0.48 : 0.22)) {
    const aiLaLiga = Object.values(clubs).filter((c) => c.isLaLiga && c.id !== userClub.id);
    if (aiLaLiga.length >= 2) {
      const buyer = aiLaLiga[Math.floor(rng() * aiLaLiga.length)];
      const candidates = Object.values(players).filter(
        (p) =>
          p.clubId !== userClub.id &&
          p.clubId !== buyer.id &&
          !p.injury &&
          p.expectedTransferValue <= buyer.transferBudgetEur * 0.85 &&
          p.expectedTransferValue >= 2_500_000 &&
          p.baseOvr >= 71
      );
      if (candidates.length > 0) {
        const picked = candidates[Math.floor(rng() * candidates.length)];
        const seller = clubs[picked.clubId];
        // Ensure seller keeps at least 16 players
        const sellerCount = Object.values(players).filter((p) => p.clubId === picked.clubId).length;
        if (seller && (!seller.isLaLiga || sellerCount > 17)) {
          const fee = roundFee(picked.expectedTransferValue * (0.95 + rng() * 0.18));
          const fakeNeg: TransferNegotiation = {
            id: `ai-${picked.id}`,
            type: 'BUY',
            playerId: picked.id,
            fromClubId: seller.id,
            toClubId: buyer.id,
            counterpartManager: seller.managerName,
            counterpartClubName: seller.name,
            stage: 'COMPLETED',
            tension: 10,
            daysOpen: 1,
            lastUpdatedDate: state.currentDate,
            askingFeeEur: fee,
            askingWageEur: picked.weeklyWageEur,
            desiredRole: 'Important',
            desiredYears: 4,
            currentOffer: {
              startDate: 'IMMEDIATE',
              transferFeeEur: fee,
              instalments: 1,
              paidNowEur: fee,
              futurePaymentsEur: 0,
              exchangePlayerId: null,
              achievementBonusEur: 0,
              sellOnClausePct: 0,
              wageEur: Math.round(picked.weeklyWageEur * 1.12),
              contractYears: 4,
              squadRole: 'Important',
              signingBonusEur: 0,
              releaseClauseEur: Math.round(fee * 2),
            },
            managerDialogue: '',
            scoutRecommendation: '',
            history: [],
          };
          const res = completeTransferInState({ ...state, clubs, players }, fakeNeg);
          clubs = res.clubs;
          players = res.players;
          if (res.transferRecord) newRecords.push(res.transferRecord);
        }
      }
    }
  }

  return { clubs, players, newNegotiations, newRecords };
}
