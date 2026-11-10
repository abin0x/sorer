// @ts-nocheck
/**
 * Shared constants and helpers for demo data generation functions.
 * Used by generate-demo-data and generate-demo-fc.
 */

export const FIRST_NAMES = ["James","Emma","Liam","Olivia","Noah","Ava","Ethan","Sophia","Mason","Isabella","Lucas","Mia","Logan","Charlotte","Aiden","Amelia","Caden","Harper","Jackson","Evelyn","Carter","Abigail","Henry","Emily","Sebastian","Ella","Jack","Grace","Owen","Chloe","Leo","Layla","Eli","Riley","Asher","Nora"];

export const LAST_NAMES = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez","Wilson","Anderson","Taylor","Thomas","Moore","Jackson","Martin","Lee","Thompson","White","Harris","Clark","Lewis","Walker","Hall","Allen","Young","King","Wright","Lopez","Hill","Scott","Green","Adams","Baker","Nelson"];

export const POSITIONS = ["1 - Goalkeeper","2 - Right Back","3 - Left Back","4 - Right Centerback","5 - Left Centerback","6 - Holding Midfielder","7 - Right Winger","8 - Center Midfielder","9 - Center Forward","10 - Attacking Midfielder","11 - Left Midfielder"];

export const rand = (arr: string[]): string => arr[Math.floor(Math.random() * arr.length)];
export const randInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

export function dobForAgeGroup(ag: { label: string }): string {
  const year = new Date().getFullYear() - parseInt(ag.label.slice(1)) - randInt(0, 1);
  const m = randInt(1, 12), d = randInt(1, 28);
  return `${year}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}