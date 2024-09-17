import { createServer } from 'http';
import fs from 'fs';

function allowAllAnonymousAccess(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', '*');
}
function accessControlConfig(req, res) {
    if (req.headers['sec-fetch-mode'] == 'cors') {
        allowAllAnonymousAccess(res);
        console.log("Client browser CORS check request");
    }
}
function CORS_Preflight(req, res) {
    if (req.method === 'OPTIONS') {
        res.end();
        console.log("Client browser CORS preflight check request");
        return true;
    }
    return false;
}
function extract_Id_From_Request(req) {
    // .../api/ressources/id
    let parts = req.url.split('/');
    return parseInt(parts[parts.length - 1]);
}
function validateContact(contact) {
    if (!('Name' in contact)) return 'Name is missing';
    if (!('Phone' in contact)) return 'Phone is missing';
    if (!('Email' in contact)) return 'Email is missing';
    return '';
}
async function handleContactsServiceRequest(req, res) {
    if (req.url.includes("/api/contacts")) {
        
        const contactsFilePath = "./contacts.json";
        let contactsJSON = fs.readFileSync(contactsFilePath);
        let contacts = JSON.parse(contactsJSON);
        let validStatus = '';
        let id = extract_Id_From_Request(req);
        switch (req.method) {
            case 'GET':
                if (isNaN(id)) {
                    res.writeHead(200, { 'content-type': 'application/json' });
                    res.end(contactsJSON);
                } else {
                    let found = false;
                    for (let contact of contacts) {
                        if (contact.Id === id) {
                            found = true;
                            res.writeHead(200, { 'content-type': 'application/json' });
                            res.end(JSON.stringify(contact));
                            break;
                        }
                    }
                    if (!found) {
                        res.writeHead(404);
                        res.end(`Error : The contact of id ${id} does not exist`);
                    }
                }
                break;
            case 'POST':
                let newContact = await getPayload(req);
                validStatus = validateContact(newContact);
                if (validStatus == '') {
                    let maxId = 0;
                    contacts.forEach(contact => {
                        if (contact.Id > maxId)
                            maxId = contact.Id;
                    });
                    newContact.Id = maxId + 1;
                    contacts.push(newContact);
                    fs.writeFileSync(contactsFilePath, JSON.stringify(contacts));
                    res.writeHead(201, { 'content-type': 'application/json' });
                    res.end(JSON.stringify(newContact));
                } else {
                    res.writeHead(400);
                    res.end(`Error: ${validStatus}`);
                }
                break;
            case 'PUT':
                let modifiedContact = await getPayload(req);
                validStatus = validateContact(modifiedContact);
                if (validStatus == '') {
                    if (!isNaN(id)) {
                        if (!('Id' in modifiedContact)) modifiedContact.Id = id;
                        if (modifiedContact.Id == id) {
                            let storedContact = null;
                            for (let contact of contacts) {
                                if (contact.Id === id) {
                                    storedContact = contact;
                                    break;
                                }
                            }
                            if (storedContact != null) {
                                storedContact.Name = modifiedContact.Name;
                                storedContact.Phone = modifiedContact.Phone;
                                storedContact.Email = modifiedContact.Email;
                                fs.writeFileSync(contactsFilePath, JSON.stringify(contacts));
                                res.writeHead(200);
                                res.end();
                            } else {
                                res.writeHead(404);
                                res.end(`Error: The contact of id ${id} does not exist.`);
                            }
                        } else {
                            res.writeHead(409);
                            res.end(`Error: Conflict of id`);
                        }
                    } else {
                        res.writeHead(400);
                        res.end("Error : You must provide the id of contact to modify.");
                    }
                } else {
                    res.writeHead(400);
                    res.end(`Error: ${validStatus}`);
                }
                break;
            case 'DELETE':
                if (!isNaN(id)) {
                    let index = 0;
                    let oneDeleted = false;
                    for (let contact of contacts) {
                        if (contact.Id === id) {
                            contacts.splice(index, 1);
                            fs.writeFileSync(contactsFilePath, JSON.stringify(contacts));
                            oneDeleted = true;
                            break;
                        }
                        index++;
                    }
                    if (oneDeleted) {
                        res.writeHead(204); // success no content
                        res.end();
                    } else {
                        res.writeHead(404);
                        res.end(`Error: The contact of id ${id} does not exist.`);
                    }
                } else {
                    res.writeHead(400);
                    res.end("Error : You must provide the id of contact to delete.");
                }
                break;
            case 'PATCH':
                res.writeHead(501);
                res.end("Error: The endpoint PATCH api/contacts is not implemented.");
                break;
        }
        return true;
    }
    return false;
}


function validateBookmark(bookmark) {
    if (!('Title' in bookmark)) return 'Title is missing';
    if (!('Url' in bookmark)) return 'Url is missing';
    if (!('Category' in bookmark)) return 'Category is missing';
    return '';
}
async function handleBookmark(req, res) {
    if (req.url.includes("/api/bookmark")) {
    const bookmarksFilePath = "./bookmark.json"; // chemin du fichier contenant les favoris
    let bookmarkJSON = fs.readFileSync(bookmarksFilePath);
    let bookmarks = JSON.parse(bookmarkJSON);
    let validStatus = '';
    let id = extract_Id_From_Request(req);

    switch (req.method) {
        case 'GET':
            // Si aucun ID n'est fourni, renvoyer tous les favoris
            if (isNaN(id)) {
                res.writeHead(200, { 'content-type': 'application/json' });
                res.end(bookmarkJSON); // renvoyer la liste complète
            } else {
                // Renvoyer un favori spécifique par ID
                let bookmark = bookmarks.find(b => b.Id === id);
                if (bookmark) {
                    res.writeHead(200, { 'content-type': 'application/json' });
                    res.end(JSON.stringify(bookmark));
                } else {
                    res.writeHead(404);
                    res.end(`Error: The bookmark with id ${id} does not exist.`);
                }
            }
            break;

        case 'POST':
            // Créer un nouveau favori
            let newBookmark = await getPayload(req);
            validStatus = validateBookmark(newBookmark); // Validation des champs du favori
            if (!validStatus) {
                newBookmark.Id = bookmarks.reduce((max, b) => Math.max(max, b.Id), 0) + 1; // Générer un nouvel ID
                bookmarks.push(newBookmark);
                fs.writeFileSync(bookmarksFilePath, JSON.stringify(bookmarks)); // Sauvegarder le nouveau favori
                res.writeHead(201, { 'content-type': 'application/json' });
                res.end(JSON.stringify(newBookmark));
            } else {
                res.writeHead(400);
                res.end(`Error: ${validStatus}`);
            }
            break;

        case 'PUT':
            // Modifier un favori existant
            let updatedBookmark = await getPayload(req);
            validStatus = validateBookmark(updatedBookmark);
            if (!validStatus) {
                if (!isNaN(id)) {
                    let bookmarkIndex = bookmarks.findIndex(b => b.Id === id);
                    if (bookmarkIndex !== -1) {
                        updatedBookmark.Id = id; // Assigner l'ID fourni
                        bookmarks[bookmarkIndex] = updatedBookmark; // Mettre à jour le favori
                        fs.writeFileSync(bookmarksFilePath, JSON.stringify(bookmarks)); // Sauvegarder
                        res.writeHead(200);
                        res.end(JSON.stringify(updatedBookmark));
                    } else {
                        res.writeHead(404);
                        res.end(`Error: The bookmark with id ${id} does not exist.`);
                    }
                } else {
                    res.writeHead(400);
                    res.end("Error: You must provide the id of the bookmark to modify.");
                }
            } else {
                res.writeHead(400);
                res.end(`Error: ${validStatus}`);
            }
            break;

        case 'DELETE':
            // Supprimer un favori
            if (!isNaN(id)) {
                let bookmarkIndex = bookmarks.findIndex(b => b.Id === id);
                if (bookmarkIndex !== -1) {
                    bookmarks.splice(bookmarkIndex, 1); // Supprimer le favori
                    fs.writeFileSync(bookmarksFilePath, JSON.stringify(bookmarks)); // Sauvegarder la nouvelle liste
                    res.writeHead(204); // Pas de contenu
                    res.end();
                } else {
                    res.writeHead(404);
                    res.end(`Error: The bookmark with id ${id} does not exist.`);
                }
            } else {
                res.writeHead(400);
                res.end("Error: You must provide the id of the bookmark to delete.");
            }
            break;

        case 'PATCH':
            res.writeHead(501);
            res.end("Error: The endpoint PATCH /api/bookmark is not implemented.");
            break;

        default:
            res.writeHead(405);
            res.end("Error: Method not allowed.");
            break;
    }
    return true;
}

return false
}

// function handleRequest(req, res) {
    
//     console.log('Handling request:', req.method, req.url);
//     if (handleBookmark(req, res)) {
//         console.log('Handled by bookmark service');
//         return true;
//     }
   
//     if (handleContactsServiceRequest(req, res)) {
//         console.log('Handled by contacts service');
//         return true;
//     }
//     return false;
    
// }



function getPayload(req) {
    return new Promise(resolve => {
        let body = [];
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            if (body.length > 0)
                if (req.headers['content-type'] == "application/json")
                    try { resolve(JSON.parse(body)); }
                    catch (error) { console.log(error); }
            resolve(null);
        });
    })
}
function handleIncomingHttpRequest(req,res){
    console.log(req.method, req.url);
    accessControlConfig(req, res);
    if (!CORS_Preflight(req, res))
        if (!handleRequest(req, res)) {
            res.writeHead(404);
            res.end();
        }
}
async function handleRequest(req, res) {
    if (! await handleContactsServiceRequest(req, res))
        if (! await handleBookmark(req, res))
            return false;
    return true;
}
const server = createServer(async (req, res) => {
    console.log(req.method, req.url);
    accessControlConfig(req, res);
    if (!CORS_Preflight(req, res))
        if (!await handleRequest(req, res)) {
            res.writeHead(404);
            res.end();
        }
});
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

