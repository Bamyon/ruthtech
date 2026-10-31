export const SEED_S=[{id:'variety',title:'Variety',sub:'Our most-loved everyday picks',order:10},{id:'food',title:'Food',sub:'Staples for every home',order:20},{id:'ingredients',title:'Ingredients',sub:'Cooking essentials, ready when you are',order:30}];
const P=(i,section,order,name,unit,price,was,desc)=>({id:'seed'+i,section,order,name,unit,price,was,desc,stock:true});
export const SEED_P=[P(0,'variety',10,'Garri','For drinking and swallow',500,650,'Fine, clean garri that soaks well for drinking and turns out smooth, soft swallow.'),
P(1,'variety',20,'Pupuru','Fermented cassava flour',700,800,'Smooth fermented cassava flour for a soft, traditional swallow the whole family loves.'),
P(2,'variety',30,'Crown Spaghetti','Premium pasta',1000,1100,'Premium spaghetti that cooks evenly and keeps its bite. Perfect for jollof, stir fry or stew.'),
P(3,'variety',40,'Golden Penny Spaghetti','Pack of 3',1050,1200,'A household favourite, ready in minutes. Great value for busy weekdays.'),
P(4,'food',10,'White Beans','1 congo, about 10 cups',1900,2200,'Clean, well-sorted white beans that cook soft. Ideal for beans porridge, moin moin and akara.'),
P(5,'food',20,'Nigeria Rice','1 congo, about 10 cups',2000,2200,'Locally grown rice with a satisfying bite and a natural aroma. Stone-free and carefully packed.'),
P(6,'food',30,'Brown Beans (Honey Beans)','1 congo, about 10 cups',2500,2800,'Sweet honey beans that cook quickly and taste rich. A favourite for ewa and stew.'),
P(7,'ingredients',10,'Vegetable Oil','Cooking oil',2000,2200,'Light, clear cooking oil for frying and everyday cooking.'),
P(8,'ingredients',20,'Palm Oil','Red palm oil',1300,1500,'Rich red palm oil for stews, soups and traditional dishes, with the flavour you expect.'),
P(9,'ingredients',30,'Gino Max Maggie','24 chicken cubes',400,450,'Chicken-flavoured seasoning cubes that bring depth to soups, stews and rice.')];
