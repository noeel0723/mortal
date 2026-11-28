import { givenNames, surnames } from './veyra.ts';
import type { Gender } from '../engine/types.ts';

// Curated selections from US Census name data, England and Wales name records,
// and Japanese name surveys. Japanese names use romanized spellings.
const american = {
  woman: [
    'Mary', 'Patricia', 'Jennifer', 'Linda', 'Barbara', 'Elizabeth', 'Susan', 'Jessica', 'Sarah', 'Karen',
    'Nancy', 'Lisa', 'Betty', 'Sandra', 'Ashley', 'Emily', 'Abigail', 'Madison', 'Chloe', 'Hannah',
  ],
  man: [
    'James', 'Michael', 'Robert', 'John', 'David', 'William', 'Richard', 'Joseph', 'Thomas', 'Charles',
    'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua',
  ],
  nonbinary: ['Taylor', 'Jordan', 'Avery', 'Cameron', 'Morgan', 'Riley', 'Casey', 'Parker', 'Skyler', 'Quinn'],
  surnames: [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Rodriguez', 'Davis', 'Martinez',
    'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Taylor', 'Clark', 'Richardson', 'Russell', 'Perez',
    'Sanchez', 'Ramirez', 'Torres', 'Flores', 'Rivera', 'Gomez', 'Nguyen', 'Kim', 'Patel', 'Chen',
    'Romero', 'Morales', 'Ortiz', 'Cruz', 'Reyes', 'Gutierrez', 'Ramos', 'Ruiz', 'Alvarez', 'Mendoza',
    'Jenkins', 'Coleman', 'Brooks', 'Powell', 'Long', 'Ross', 'Henderson', 'Sanders', 'Reed', 'Sullivan',
  ],
};

const english = {
  woman: [
    'Olivia', 'Amelia', 'Isla', 'Freya', 'Poppy', 'Charlotte', 'Florence', 'Alice', 'Imogen', 'Sienna',
    'Elsie', 'Ivy', 'Evie', 'Millie', 'Matilda', 'Harriet', 'Martha', 'Beatrice', 'Lucy', 'Eleanor',
  ],
  man: [
    'Oliver', 'George', 'Arthur', 'Harry', 'Jack', 'Henry', 'Charlie', 'Alfie', 'Archie', 'Freddie',
    'Theo', 'Oscar', 'Jacob', 'Hugo', 'Reuben', 'Edward', 'Louis', 'Finley', 'Rory', 'Toby',
  ],
  nonbinary: ['Robin', 'Jamie', 'Alex', 'Sam', 'Drew', 'Kit', 'Frankie', 'Blair', 'Alexis', 'Remy'],
  surnames: [
    'Davies', 'Evans', 'Thomas', 'Roberts', 'Walker', 'Wright', 'Robinson', 'Thompson', 'White', 'Hall',
    'Green', 'Edwards', 'Wood', 'Hughes', 'Lewis', 'Martin', 'Jackson', 'Clarke', 'Turner', 'Hill',
    'Moore', 'Cooper', 'King', 'Harrison', 'Baker', 'Allen', 'Morris', 'Ward', 'Watson', 'Young',
    'Lee', 'James', 'Scott', 'Bennett', 'Phillips', 'Knight', 'Parker', 'Cook', 'Bailey', 'Carter',
    'Shaw', 'Reynolds', 'Chapman', 'Mitchell', 'Griffiths', 'Murray', 'Kelly', 'Price', 'Holmes', 'Barker',
  ],
};

const japanese = {
  woman: [
    'Yui', 'Sakura', 'Himari', 'Hina', 'Saki', 'Mei', 'Akari', 'Nanami', 'Riko', 'Tsumugi',
    'Yuna', 'Misaki', 'Ayaka', 'Haruka', 'Hana', 'Yuka', 'Yoko', 'Keiko', 'Naomi', 'Sayuri',
  ],
  man: [
    'Haruto', 'Minato', 'Yuto', 'Souta', 'Riku', 'Kaito', 'Daiki', 'Takumi', 'Hiroshi', 'Kenji',
    'Takeshi', 'Kenta', 'Satoshi', 'Daisuke', 'Masato', 'Shota', 'Hayato', 'Takeru', 'Shun', 'Tatsuya',
  ],
  nonbinary: ['Aoi', 'Akira', 'Hikaru', 'Kaoru', 'Makoto', 'Rei', 'Haru', 'Aki', 'Yuki', 'Nao'],
  surnames: [
    'Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Ito', 'Watanabe', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato',
    'Yoshida', 'Yamada', 'Sasaki', 'Yamaguchi', 'Matsumoto', 'Inoue', 'Kimura', 'Hayashi', 'Shimizu', 'Saito',
    'Yamazaki', 'Mori', 'Ikeda', 'Hashimoto', 'Abe', 'Ishikawa', 'Yamashita', 'Nakajima', 'Ishii', 'Ogawa',
    'Maeda', 'Okada', 'Hasegawa', 'Fujita', 'Goto', 'Kondo', 'Murakami', 'Endo', 'Aoki', 'Sakamoto',
    'Matsuda', 'Nishimura', 'Nakagawa', 'Nakano', 'Harada', 'Ono', 'Tamura', 'Fujiwara', 'Takeuchi', 'Kaneko',
  ],
};

function namesFor(gender: Gender): readonly [string, ...string[]] {
  return [...givenNames[gender], ...american[gender], ...english[gender], ...japanese[gender]];
}

export const npcGivenNames = {
  woman: namesFor('woman'),
  man: namesFor('man'),
  nonbinary: namesFor('nonbinary'),
};
export const npcSurnames = [...surnames, ...american.surnames, ...english.surnames, ...japanese.surnames] as const;
